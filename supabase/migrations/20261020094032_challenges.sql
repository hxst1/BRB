-- Retos de 2048: "supera mi puntuación" jugando exactamente la misma partida.
--
-- Un reto apunta a una partida terminada del retador (de ahí salen la semilla
-- y la puntuación objetivo). El retado tiene un único intento: empieza una
-- partida con esa semilla y se valida como cualquier otra. El resultado se
-- deriva del estado de esa partida, no se guarda aparte.
--
-- La semilla no se revela hasta que el retado empieza: game_runs solo es
-- visible para su dueño, y la puntuación objetivo se copia al reto.

-- ---------------------------------------------------------------------------
-- Inicio de partida compartido entre partidas normales y retos
-- ---------------------------------------------------------------------------

create function private.begin_run(run_game text, run_seed bigint)
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

  -- Empezar una nueva abandona la que estuviera en curso (también la de un reto).
  update public.game_runs r
  set status = 'abandoned', finished_at = now()
  where r.user_id = auth.uid() and r.game = run_game and r.status = 'playing';

  return query
  insert into public.game_runs (user_id, game, seed)
  values (auth.uid(), run_game, run_seed)
  returning game_runs.id, game_runs.seed;
end;
$$;

create or replace function public.start_run(game text)
returns table (id uuid, seed bigint)
language sql
security definer
set search_path = ''
as $$
  select * from private.begin_run(start_run.game, private.random_uint32());
$$;

-- ---------------------------------------------------------------------------
-- Retos
-- ---------------------------------------------------------------------------

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('2048')),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  challenged_id uuid not null references public.profiles (id) on delete cascade,
  source_run_id uuid not null references public.game_runs (id) on delete cascade,
  target_score integer not null check (target_score >= 0),
  attempt_run_id uuid unique references public.game_runs (id) on delete set null,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  constraint challenges_two_players check (challenger_id <> challenged_id),
  -- Un reto por partida y amigo: retar otra vez con la misma partida devuelve el mismo.
  constraint challenges_once_per_run unique (source_run_id, challenged_id)
);

create index challenges_challenged_idx on public.challenges (challenged_id, created_at desc);
create index challenges_challenger_idx on public.challenges (challenger_id, created_at desc);

alter table public.challenges enable row level security;

create policy "Cada jugador ve sus retos"
  on public.challenges for select
  to authenticated
  using ((select auth.uid()) in (challenger_id, challenged_id));

revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

-- Reta a un amigo con una de tus partidas terminadas.
create function public.create_challenge(run_id uuid, friend uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run public.game_runs;
  result uuid;
begin
  select * into run from public.game_runs r
  where r.id = run_id and r.user_id = auth.uid() and r.status = 'finished';

  if run.id is null then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
  if not private.are_friends(auth.uid(), friend) then
    raise exception 'Solo puedes retar a tus amigos' using errcode = 'P0001', hint = 'not_friends';
  end if;

  insert into public.challenges (game, challenger_id, challenged_id, source_run_id, target_score)
  values (run.game, auth.uid(), friend, run.id, run.score)
  on conflict (source_run_id, challenged_id) do nothing
  returning id into result;

  if result is null then
    select c.id into result from public.challenges c
    where c.source_run_id = run.id and c.challenged_id = friend;
  end if;
  return result;
end;
$$;

create function public.decline_challenge(challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
  set declined_at = now()
  where id = challenge_id
    and challenged_id = auth.uid()
    and attempt_run_id is null
    and declined_at is null;

  if not found then
    raise exception 'Reto no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

-- Empieza el único intento del reto con la semilla del retador. Repetir la
-- llamada en los primeros segundos devuelve la misma partida (recarga
-- accidental o doble montaje en desarrollo); después ya no, para que no se
-- pueda "estudiar" la partida y volver a empezarla.
create function public.start_challenge_run(challenge_id uuid)
returns table (id uuid, seed bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge public.challenges;
  attempt public.game_runs;
  source_seed bigint;
begin
  select * into challenge from public.challenges c
  where c.id = challenge_id and c.challenged_id = auth.uid() and c.declined_at is null
  for update;

  if challenge.id is null then
    raise exception 'Reto no encontrado' using errcode = 'P0002';
  end if;

  if challenge.attempt_run_id is not null then
    select * into attempt from public.game_runs r where r.id = challenge.attempt_run_id;
    if attempt.status = 'playing' and attempt.started_at > now() - interval '10 seconds' then
      return query select attempt.id, attempt.seed;
      return;
    end if;
    raise exception 'Ya has jugado este reto' using errcode = 'P0001', hint = 'already_played';
  end if;

  select r.seed into source_seed from public.game_runs r where r.id = challenge.source_run_id;

  return query
  with started as (
    select * from private.begin_run(challenge.game, source_seed)
  ), linked as (
    update public.challenges c set attempt_run_id = (select started.id from started)
    where c.id = challenge.id
  )
  select started.id, started.seed from started;
end;
$$;

-- Retos del usuario (enviados y recibidos) con su estado calculado:
-- pending | declined | playing | won | lost (won/lost desde el punto de vista del retado).
create function public.get_my_challenges(max_rows integer default 30)
returns table (
  id uuid,
  game text,
  incoming boolean,
  other_id uuid,
  other_username text,
  other_avatar_seed bigint,
  other_avatar_parts jsonb,
  target_score integer,
  attempt_score integer,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.game,
    c.challenged_id = auth.uid(),
    p.id,
    p.username,
    p.avatar_seed,
    p.avatar_parts,
    c.target_score,
    case when r.status = 'finished' then r.score end,
    case
      when c.declined_at is not null then 'declined'
      when r.id is null then 'pending'
      when r.status = 'playing' then 'playing'
      when r.status = 'finished' and r.score > c.target_score then 'won'
      else 'lost'
    end,
    c.created_at
  from public.challenges c
  join public.profiles p on p.id = case when c.challenged_id = auth.uid() then c.challenger_id else c.challenged_id end
  left join public.game_runs r on r.id = c.attempt_run_id
  where auth.uid() in (c.challenger_id, c.challenged_id)
  order by c.created_at desc
  limit least(greatest(max_rows, 1), 100);
$$;

-- El aviso de la cabecera cuenta también los retos sin jugar.
drop function public.get_pending_counts();

create function public.get_pending_counts()
returns table (my_turn integer, match_invites integer, friend_requests integer, challenges integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- 3 en raya: mueve X con un número par de movimientos y O con uno impar.
    (select count(*)::integer from public.matches m
     where m.status = 'active'
       and ((m.player_x = auth.uid() and cardinality(m.moves) % 2 = 0)
         or (m.player_o = auth.uid() and cardinality(m.moves) % 2 = 1))),
    (select count(*)::integer from public.matches m
     where m.status = 'pending'
       and m.created_by <> auth.uid()
       and auth.uid() in (m.player_x, m.player_o)),
    (select count(*)::integer from public.friendships f
     where f.status = 'pending' and f.addressee_id = auth.uid()),
    (select count(*)::integer from public.challenges c
     where c.challenged_id = auth.uid() and c.attempt_run_id is null and c.declined_at is null);
$$;

revoke execute on function
  public.create_challenge(uuid, uuid),
  public.decline_challenge(uuid),
  public.start_challenge_run(uuid),
  public.get_my_challenges(integer),
  public.get_pending_counts()
from public, anon, authenticated;

grant execute on function
  public.create_challenge(uuid, uuid),
  public.decline_challenge(uuid),
  public.start_challenge_run(uuid),
  public.get_my_challenges(integer),
  public.get_pending_counts()
to authenticated;
