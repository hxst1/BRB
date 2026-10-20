-- Esquema inicial: perfiles, códigos de amigo, amistades, partidas y rankings.
--
-- Reglas generales:
-- * El cliente solo lee (con RLS). Toda escritura sensible pasa por funciones
--   `security definer` que validan quién llama y qué puede hacer.
-- * Las funciones que solo debe llamar el servidor (validación de partidas)
--   se reservan a `service_role`.
-- * Lo interno que no debe exponerse por la API vive en el esquema `private`.

create schema private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_seed bigint not null check (avatar_seed between 0 and 4294967295),
  avatar_parts jsonb not null default '{}'::jsonb check (octet_length(avatar_parts::text) <= 2048),
  xp integer not null default 0 check (xp >= 0),
  supporter_tier text check (supporter_tier in ('supporter')),
  supporter_since timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "Los perfiles son públicos"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Cada usuario edita su propio perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
-- XP y estado de supporter solo los cambia el servidor.
grant update (username, avatar_seed, avatar_parts) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Códigos de amigo
-- ---------------------------------------------------------------------------
-- Tabla aparte para que el código solo lo vea su dueño: si estuviera en
-- `profiles` cualquiera podría sacar todos los códigos desde el ranking.
-- Alfabeto sin caracteres ambiguos (sin 0, 1, I, L, O): 31^5 ≈ 28 millones.

create table public.friend_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{5}$')
);

alter table public.friend_codes enable row level security;

create policy "Cada usuario ve su propio código"
  on public.friend_codes for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.friend_codes from anon, authenticated;
grant select on public.friend_codes to authenticated;

create function private.random_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(5);
  result text := '';
begin
  for i in 0..4 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

create function private.random_uint32()
returns bigint
language sql
volatile
set search_path = ''
as $$
  select ('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint;
$$;

-- Crea perfil y código de amigo al registrarse. El nombre de usuario se toma
-- de los metadatos del registro si es válido y está libre; si no, se genera.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'username';
  v_code text;
  v_username text;
begin
  loop
    v_code := private.random_friend_code();
    continue when exists (select 1 from public.friend_codes where code = v_code);

    if requested ~ '^[A-Za-z0-9_]{3,20}$'
      and not exists (select 1 from public.profiles where lower(username) = lower(requested)) then
      v_username := requested;
    else
      v_username := 'player_' || lower(v_code);
    end if;

    continue when exists (select 1 from public.profiles where lower(username) = lower(v_username));

    -- Dos registros simultáneos pueden pedir el mismo nombre o sacar el mismo
    -- código: si choca con el índice único se reintenta en vez de fallar el registro.
    begin
      insert into public.profiles (id, username, avatar_seed)
      values (new.id, v_username, private.random_uint32());

      insert into public.friend_codes (user_id, code)
      values (new.id, v_code);

      return new;
    exception when unique_violation then
      requested := null;
    end;
  end loop;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Amistades
-- ---------------------------------------------------------------------------

create type public.friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Una sola relación por pareja, sin importar quién la inició.
create unique index friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "Cada usuario ve sus amistades y solicitudes"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

create function private.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  );
$$;

-- Registro de intentos para limitar la búsqueda de códigos por fuerza bruta.
create table private.friend_request_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index friend_request_attempts_user_idx
  on private.friend_request_attempts (user_id, created_at desc);

-- Devuelve un estado en vez de lanzar errores para que el intento quede
-- registrado (una excepción desharía el insert del límite de intentos):
-- 'sent' | 'accepted' | 'already_sent' | 'already_friends' | 'self' | 'not_found' | 'rate_limited'
create function public.send_friend_request(friend_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  -- Serializa las llamadas de un mismo usuario: sin esto, N peticiones en
  -- paralelo verían todas el contador por debajo del límite.
  perform pg_advisory_xact_lock(hashtextextended('friend_request:' || me::text, 0));

  delete from private.friend_request_attempts
  where user_id = me and created_at <= now() - interval '1 hour';

  if (
    select count(*) from private.friend_request_attempts
    where user_id = me and created_at > now() - interval '1 hour'
  ) >= 20 then
    return 'rate_limited';
  end if;

  insert into private.friend_request_attempts (user_id) values (me);

  select user_id into target
  from public.friend_codes
  where code = upper(trim(friend_code));

  if target is null then
    return 'not_found';
  elsif target = me then
    return 'self';
  end if;

  -- Si el otro nos envía una solicitud a la vez, el índice único de la pareja
  -- hace que solo una inserción gane; la otra lee la fila ganadora.
  insert into public.friendships (requester_id, addressee_id)
  values (me, target)
  on conflict do nothing;

  if found then
    return 'sent';
  end if;

  select * into existing
  from public.friendships
  where least(requester_id, addressee_id) = least(me, target)
    and greatest(requester_id, addressee_id) = greatest(me, target)
  for update;

  if existing.id is null then
    -- La fila se borró entre medias (solicitud rechazada a la vez): se crea de nuevo.
    insert into public.friendships (requester_id, addressee_id) values (me, target);
    return 'sent';
  elsif existing.status = 'accepted' then
    return 'already_friends';
  elsif existing.requester_id = me then
    return 'already_sent';
  end if;

  -- El otro ya nos había enviado una solicitud: añadirle equivale a aceptarla.
  update public.friendships
  set status = 'accepted', accepted_at = now()
  where id = existing.id;
  return 'accepted';
end;
$$;

create function public.respond_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if accept then
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where id = request_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where id = request_id and addressee_id = auth.uid() and status = 'pending';
  end if;

  if not found then
    raise exception 'Solicitud no encontrada' using errcode = 'P0002';
  end if;
end;
$$;

-- Elimina una amistad o cancela una solicitud enviada.
create function public.remove_friend(friend_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friendships
  where least(requester_id, addressee_id) = least(auth.uid(), friend_id)
    and greatest(requester_id, addressee_id) = greatest(auth.uid(), friend_id);
$$;

-- ---------------------------------------------------------------------------
-- Partidas en solitario
-- ---------------------------------------------------------------------------
-- Contra la pesca de semillas (abrir muchas partidas y jugar solo la mejor):
-- una partida en curso por juego, máximo de partidas por hora y caducidad
-- (MAX_RUN_DURATION en el servidor).
--
-- Flujo: el cliente llama a `start_run` y recibe una semilla. Al terminar envía
-- los movimientos al servidor de Next, que repite la partida con @repo/games y
-- llama a `finish_run` o `reject_run` con la service role. El cliente nunca
-- puede fijar su propia puntuación.

create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('2048')),
  seed bigint not null check (seed between 0 and 4294967295),
  status text not null default 'playing'
    check (status in ('playing', 'finished', 'rejected', 'abandoned')),
  moves text,
  score integer check (score >= 0),
  max_tile integer check (max_tile >= 0),
  rejection_reason text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Mejor partida por jugador (DISTINCT ON del ranking).
create index game_runs_leaderboard_idx
  on public.game_runs (game, user_id, score desc, finished_at)
  where status = 'finished';
create index game_runs_user_idx on public.game_runs (user_id, started_at desc);
-- Una sola partida en curso por usuario y juego.
create unique index game_runs_one_playing_idx
  on public.game_runs (user_id, game)
  where status = 'playing';

alter table public.game_runs enable row level security;

create policy "Cada usuario ve sus partidas"
  on public.game_runs for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.game_runs from anon, authenticated;
grant select on public.game_runs to authenticated;

create function public.start_run(game text)
returns table (id uuid, seed bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('start_run:' || auth.uid()::text, 0));

  if (
    select count(*) from public.game_runs r
    where r.user_id = auth.uid() and r.started_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'Demasiadas partidas en poco tiempo, descansa un poco'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  -- Empezar una nueva abandona la que estuviera en curso.
  update public.game_runs r
  set status = 'abandoned', finished_at = now()
  where r.user_id = auth.uid() and r.game = start_run.game and r.status = 'playing';

  return query
  insert into public.game_runs (user_id, game, seed)
  values (auth.uid(), start_run.game, private.random_uint32())
  returning game_runs.id, game_runs.seed;
end;
$$;

-- XP ganada por partida: crece con la puntuación pero premia también jugar.
create function private.xp_for_score(score integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 1 + score / 200;
$$;

create function public.finish_run(run_id uuid, moves text, score integer, max_tile integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  update public.game_runs
  set status = 'finished',
      moves = finish_run.moves,
      score = finish_run.score,
      max_tile = finish_run.max_tile,
      finished_at = now()
  where id = run_id and status = 'playing'
  returning user_id into owner;

  if owner is null then
    raise exception 'Partida no encontrada o ya cerrada' using errcode = 'P0002';
  end if;

  update public.profiles
  set xp = xp + private.xp_for_score(finish_run.score)
  where id = owner;
end;
$$;

create function public.reject_run(run_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_runs
  set status = 'rejected', rejection_reason = reason, finished_at = now()
  where id = run_id and status = 'playing';

  if not found then
    raise exception 'Partida no encontrada o ya cerrada' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rankings
-- ---------------------------------------------------------------------------
-- Mejor partida de cada jugador. scope: 'global' | 'friends'; period: 'all' | 'week'.

create function public.get_leaderboard(
  game text,
  scope text default 'global',
  period text default 'all',
  max_rows integer default 50
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_seed bigint,
  avatar_parts jsonb,
  supporter_tier text,
  score integer,
  achieved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if scope not in ('global', 'friends') then
    raise exception 'scope no válido: %', scope using errcode = '22023';
  elsif period not in ('all', 'week') then
    raise exception 'period no válido: %', period using errcode = '22023';
  elsif scope = 'friends' and auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  return query
  with best as (
    select distinct on (r.user_id) r.user_id, r.score, r.finished_at
    from public.game_runs r
    where r.game = get_leaderboard.game
      and r.status = 'finished'
      and (period = 'all' or r.finished_at >= date_trunc('week', now()))
      and (
        scope = 'global'
        or r.user_id = auth.uid()
        or private.are_friends(auth.uid(), r.user_id)
      )
    order by r.user_id, r.score desc, r.finished_at
  )
  select
    rank() over (order by b.score desc),
    p.id,
    p.username,
    p.avatar_seed,
    p.avatar_parts,
    p.supporter_tier,
    b.score,
    b.finished_at
  from best b
  join public.profiles p on p.id = b.user_id
  order by b.score desc, b.finished_at
  limit least(greatest(max_rows, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de las funciones
-- ---------------------------------------------------------------------------
-- Postgres concede EXECUTE a PUBLIC por defecto: se quita y se da explícitamente.

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.start_run(text) to authenticated;
grant execute on function public.get_leaderboard(text, text, text, integer) to anon, authenticated;

grant execute on function public.finish_run(uuid, text, integer, integer) to service_role;
grant execute on function public.reject_run(uuid, text) to service_role;
