-- Hundir la flota ('battleship') contra amigos.
--
-- Al aceptar el reto, cada jugador coloca su flota. La flota solo la ve su
-- dueño (hasta que la partida termina) y la guarda el servidor de Next tras
-- validarla con @repo/games/battleship. Los disparos son públicos: van en
-- `matches.moves` con el resultado ya resuelto por el servidor (ver el motor),
-- igual que las jugadas del 3 y el 4 en raya.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tictactoe', 'connect4', 'battleship', 'rps', 'rpsls', 'pong'));

-- 'fleet': ganada hundiendo toda la flota del rival.
alter table public.matches drop constraint matches_end_reason_check;
alter table public.matches add constraint matches_end_reason_check
  check (end_reason in ('line', 'rounds', 'points', 'fleet', 'draw', 'resign', 'disputed'));

create or replace function private.award_match_xp(m public.matches)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tope de XP: solo las primeras partidas del día entre la misma pareja
  -- cuentan, para que dos amigos no puedan farmear.
  if (
    select count(*) from public.matches x
    where x.game = m.game
      and least(x.player_x, x.player_o) = least(m.player_x, m.player_o)
      and greatest(x.player_x, x.player_o) = greatest(m.player_x, m.player_o)
      and x.status = 'finished'
      and x.end_reason in ('line', 'rounds', 'points', 'fleet', 'draw')
      and x.updated_at > now() - interval '1 day'
  ) > 5 then
    return;
  end if;

  if m.end_reason in ('line', 'rounds', 'points', 'fleet') then
    perform private.award_xp(case when m.winner = 'x' then m.player_x else m.player_o end, 10);
    perform private.award_xp(case when m.winner = 'x' then m.player_o else m.player_x end, 2);
  elsif m.end_reason = 'draw' then
    perform private.award_xp(m.player_x, 4);
    perform private.award_xp(m.player_o, 4);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Flotas
-- ---------------------------------------------------------------------------

create table public.battleship_fleets (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  -- Lista de barcos; cada uno, la lista de sus casillas (0-99).
  ships jsonb not null check (jsonb_typeof(ships) = 'array' and jsonb_array_length(ships) = 5),
  created_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

alter table public.battleship_fleets enable row level security;

-- Tu flota siempre; la del rival, solo cuando la partida ha terminado.
create policy "Cada jugador ve su flota y, al acabar, la del rival"
  on public.battleship_fleets for select
  to authenticated
  using (
    (select auth.uid()) = player_id
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.status = 'finished' and (select auth.uid()) in (m.player_x, m.player_o)
    )
  );

revoke all on public.battleship_fleets from anon, authenticated;
grant select on public.battleship_fleets to authenticated;

-- Guarda la flota ya validada. Solo antes del primer disparo y una vez por jugador.
create function public.submit_battleship_fleet(match_id uuid, player_id uuid, ships jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  select * into m from public.matches x where x.id = submit_battleship_fleet.match_id for update;
  if m.id is null or m.game <> 'battleship' or m.status <> 'active'
     or submit_battleship_fleet.player_id not in (m.player_x, m.player_o) then
    raise exception 'Partida no encontrada o no está en juego' using errcode = 'P0002';
  end if;
  if cardinality(m.moves) > 0 then
    raise exception 'La partida ya ha empezado' using errcode = 'P0001', hint = 'started';
  end if;

  insert into public.battleship_fleets (match_id, player_id, ships)
  values (submit_battleship_fleet.match_id, submit_battleship_fleet.player_id, submit_battleship_fleet.ships)
  on conflict do nothing;
  if not found then
    raise exception 'Ya has colocado tu flota' using errcode = 'P0001', hint = 'already_placed';
  end if;

  -- Para que el rival se entere en directo (Realtime y LiveRefresh escuchan matches).
  update public.matches x set updated_at = now() where x.id = m.id;
end;
$$;

-- Quién ha colocado ya su flota en tus partidas de hundir la flota en juego.
create function public.get_battleship_status()
returns table (match_id uuid, me_ready boolean, rival_ready boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    exists (select 1 from public.battleship_fleets f where f.match_id = m.id and f.player_id = auth.uid()),
    exists (select 1 from public.battleship_fleets f where f.match_id = m.id and f.player_id <> auth.uid())
  from public.matches m
  where m.game = 'battleship' and m.status = 'active' and auth.uid() in (m.player_x, m.player_o);
$$;

revoke execute on function
  public.submit_battleship_fleet(uuid, uuid, jsonb),
  public.get_battleship_status()
from public, anon, authenticated;
grant execute on function public.submit_battleship_fleet(uuid, uuid, jsonb) to service_role;
grant execute on function public.get_battleship_status() to authenticated;

-- ---------------------------------------------------------------------------
-- Avisos y chat
-- ---------------------------------------------------------------------------

-- "Te toca": colocar tu flota o, con las dos colocadas, disparar en tu turno.
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
         when m.game in ('tictactoe', 'connect4') then
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
      when 'connect4' then 'Reto al 4 en raya'
      when 'battleship' then 'Reto a hundir la flota'
      else 'Reto al 3 en raya'
    end,
    'match',
    new.id
  );
  return new;
end;
$$;
