-- Tres juegos más contra amigos:
--
-- - Reversi ('reversi') y puntos y cajas ('dots'): por turnos, como el 4 en
--   raya. El servidor de Next valida cada jugada con @repo/games y la guarda
--   con apply_match_move. Cuando alguien pierde el turno (en el Reversi, por no
--   tener jugada; en puntos y cajas, porque el rival ha cerrado una caja) la
--   propia lógica añade un movimiento -1. Así X sigue moviendo con un número
--   par de movimientos y O con uno impar, y el "te toca" es el de siempre.
--   Gana quien tenga más fichas o cajas al final ('points').
--
-- - Carrera de tecleo ('typing'): en directo. Cuando los dos habéis entrado
--   (cada uno lo dice con start_typing_race), el servidor fija la salida y
--   cada uno escribe el mismo
--   texto; el primero que lo acaba sin errores gana ('points'). El tiempo lo
--   mide la base de datos, no el navegador. Por el canal privado `typing:<id>`
--   solo va el progreso del rival, para verlo avanzar.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tictactoe', 'connect4', 'battleship', 'rps', 'rpsls', 'pong', 'tron', 'chess', 'reversi', 'dots', 'typing'));

-- ---------------------------------------------------------------------------
-- Carrera de tecleo
-- ---------------------------------------------------------------------------

create table public.typing_races (
  match_id uuid primary key references public.matches (id) on delete cascade,
  -- El idioma del texto: el de quien retó.
  language text not null check (language in ('es', 'en')),
  -- La salida, con la cuenta atrás ya incluida.
  starts_at timestamptz not null
);

comment on table public.typing_races is 'Salida de cada carrera de tecleo. Solo la usa el servidor.';

alter table public.typing_races enable row level security;
revoke all on public.typing_races from anon, authenticated;

-- Quién ha entrado ya a la carrera. Sin los dos no hay salida: así nadie
-- puede arrancarla solo y ganar antes de que el otro llegue.
create table public.typing_ready (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  primary key (match_id, player_id)
);

comment on table public.typing_ready is 'Jugadores que han entrado a cada carrera de tecleo. Solo la usa el servidor.';

alter table public.typing_ready enable row level security;
revoke all on public.typing_ready from anon, authenticated;

-- Apunta que `player_id` ha entrado y, cuando están los dos, fija la salida
-- (una sola vez). Devuelve la salida con su idioma, o nada si falta el otro.
-- `countdown_ms` es la cuenta atrás hasta poder escribir; `server_now`, para
-- que el navegador ajuste su reloj.
create function public.start_typing_race(match_id uuid, player_id uuid, language text, countdown_ms integer)
returns table (race_language text, starts_at timestamptz, server_now timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  -- Bloquea la partida para que los dos no fijen la salida a la vez.
  select * into m from public.matches where id = start_typing_race.match_id for update;
  if m.id is null or m.game <> 'typing' or m.status <> 'active' or player_id not in (m.player_x, m.player_o) then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;

  insert into public.typing_ready (match_id, player_id)
  values (m.id, start_typing_race.player_id)
  on conflict do nothing;

  if (select count(*) from public.typing_ready r where r.match_id = m.id) = 2 then
    insert into public.typing_races (match_id, language, starts_at)
    values (m.id, start_typing_race.language, now() + make_interval(secs => countdown_ms / 1000.0))
    on conflict do nothing;
  end if;

  return query
  select r.language, r.starts_at, now() from public.typing_races r where r.match_id = start_typing_race.match_id;
end;
$$;

-- El primero que acaba gana. Devuelve los milisegundos que ha tardado.
-- `min_ms` es lo mínimo que se puede tardar en escribir el texto: si llega
-- antes, no se ha tecleado (o se ha empezado antes de la salida).
create function public.finish_typing_race(match_id uuid, player_id uuid, min_ms integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  race public.typing_races;
  elapsed integer;
begin
  select * into m from public.matches where id = finish_typing_race.match_id for update;
  if m.id is null or m.game <> 'typing' or player_id not in (m.player_x, m.player_o) then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
  if m.status <> 'active' then
    raise exception 'La partida ya ha terminado' using errcode = 'P0002';
  end if;

  select * into race from public.typing_races r where r.match_id = m.id;
  if race.match_id is null then
    raise exception 'La carrera no ha empezado' using errcode = 'P0001', hint = 'not_started';
  end if;

  elapsed := (extract(epoch from now() - race.starts_at) * 1000)::integer;
  if elapsed < min_ms then
    raise exception 'Demasiado rápido' using errcode = 'P0001', hint = 'too_fast';
  end if;

  -- El tiempo del ganador, en décimas (cabe en un smallint hasta casi una hora).
  update public.matches
  set status = 'finished', end_reason = 'points',
      winner = case when player_id = m.player_x then 'x' else 'o' end,
      moves = array[least(elapsed / 100, 32767)]::smallint[],
      updated_at = now()
  where id = m.id
  returning * into m;

  perform private.award_match_xp(m);
  return elapsed;
end;
$$;

revoke execute on function
  public.start_typing_race(uuid, uuid, text, integer),
  public.finish_typing_race(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function
  public.start_typing_race(uuid, uuid, text, integer),
  public.finish_typing_race(uuid, uuid, integer)
to service_role;

-- Canal privado de Realtime: solo los dos jugadores.
-- security definer: las políticas de Realtime se evalúan con el rol del usuario.
create function private.can_join_typing(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select topic ~ '^typing:[0-9a-f-]{36}$' and exists (
    select 1 from public.matches m
    where m.id = substring(topic from 8)::uuid
      and m.game = 'typing'
      and auth.uid() in (m.player_x, m.player_o)
  );
$$;

revoke execute on function private.can_join_typing(text) from public;
grant execute on function private.can_join_typing(text) to authenticated;

create policy "Solo los jugadores reciben la carrera"
  on realtime.messages for select
  to authenticated
  using (private.can_join_typing(realtime.topic()));

create policy "Solo los jugadores emiten en la carrera"
  on realtime.messages for insert
  to authenticated
  with check (private.can_join_typing(realtime.topic()));

-- ---------------------------------------------------------------------------
-- Avisos y chat
-- ---------------------------------------------------------------------------

-- "Te toca": el Reversi y puntos y cajas, como el 4 en raya; la carrera, como
-- el pong, está pendiente mientras no se haya corrido.
create or replace function public.get_pending_counts()
returns table (my_turn integer, match_invites integer, friend_requests integer, challenges integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.matches m
     where m.status = 'active'
       and auth.uid() in (m.player_x, m.player_o)
       and case
         when m.game in ('tictactoe', 'connect4', 'chess', 'reversi', 'dots') then
           (m.player_x = auth.uid() and cardinality(m.moves) % 2 = 0)
           or (m.player_o = auth.uid() and cardinality(m.moves) % 2 = 1)
         when m.game = 'battleship' then
           not exists (select 1 from public.battleship_fleets f where f.match_id = m.id and f.player_id = auth.uid())
           or (
             exists (select 1 from public.battleship_fleets f where f.match_id = m.id and f.player_id <> auth.uid())
             and ((m.player_x = auth.uid() and cardinality(m.moves) % 2 = 0)
               or (m.player_o = auth.uid() and cardinality(m.moves) % 2 = 1))
           )
         when m.game = 'pong' then not exists (
           select 1 from public.pong_reports r where r.match_id = m.id and r.player_id = auth.uid()
         )
         when m.game = 'tron' then not exists (
           select 1 from public.tron_reports r where r.match_id = m.id and r.player_id = auth.uid()
         )
         when m.game = 'typing' then true
         else not exists (
           select 1 from public.match_choices c
           where c.match_id = m.id and c.player_id = auth.uid() and c.round = cardinality(m.moves) / 2
         )
       end),
    (select count(*)::integer from public.matches m
     where m.status = 'pending'
       and m.created_by <> auth.uid()
       and auth.uid() in (m.player_x, m.player_o)),
    (select count(*)::integer from public.friendships f
     where f.status = 'pending' and f.addressee_id = auth.uid()),
    (select count(*)::integer from public.challenges c
     where c.challenged_id = auth.uid() and c.attempt_run_id is null and c.declined_at is null);
$$;

-- La tarjeta del reto en el chat.
create or replace function private.post_match_embed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.messages (sender_id, recipient_id, body, kind, ref_id)
  values (
    new.created_by,
    case when new.created_by = new.player_x then new.player_o else new.player_x end,
    case new.game
      when 'rps' then 'Reto a piedra, papel o tijera'
      when 'rpsls' then 'Reto a piedra, papel, tijera, lagarto o Spock'
      when 'pong' then 'Reto al pong'
      when 'tron' then 'Reto al Tron'
      when 'connect4' then 'Reto al 4 en raya'
      when 'battleship' then 'Reto a hundir la flota'
      when 'chess' then 'Reto al ajedrez'
      when 'reversi' then 'Reto al Reversi'
      when 'dots' then 'Reto a puntos y cajas'
      when 'typing' then 'Reto a una carrera de tecleo'
      else 'Reto al 3 en raya'
    end,
    'match',
    new.id
  );
  return new;
end;
$$;
