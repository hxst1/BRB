-- Tron en directo entre amigos ('tron').
--
-- Igual que el pong: se juega por Realtime en un canal privado `tron:<id>` al
-- que solo entran los dos jugadores. X simula y retransmite; al acabar, los
-- dos comunican el marcador de rondas y la partida solo se da por ganada (con
-- XP) si coinciden. Si no, queda en disputa y sin XP. Se gana a 3 rondas.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tictactoe', 'connect4', 'battleship', 'rps', 'rpsls', 'pong', 'tron'));

-- ---------------------------------------------------------------------------
-- Resultado
-- ---------------------------------------------------------------------------

create table public.tron_reports (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  x_score integer not null check (x_score between 0 and 3),
  o_score integer not null check (o_score between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (match_id, player_id),
  -- La partida acaba cuando alguien llega a 3 rondas (y solo uno).
  constraint tron_reports_one_winner check ((x_score = 3) <> (o_score = 3))
);

alter table public.tron_reports enable row level security;

create policy "Cada jugador ve su propio resultado del tron"
  on public.tron_reports for select
  to authenticated
  using ((select auth.uid()) = player_id);

revoke all on public.tron_reports from anon, authenticated;
grant select on public.tron_reports to authenticated;

-- Devuelve 'waiting' (falta el otro), 'finished' o 'disputed'.
create function public.report_tron_result(match_id uuid, x_score integer, o_score integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  rival_report public.tron_reports;
begin
  -- Bloquea la partida para que los dos informes no se crucen.
  select * into m from public.matches where id = match_id for update;

  if m.id is null or m.game <> 'tron' or auth.uid() not in (m.player_x, m.player_o) then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
  if m.status <> 'active' then
    raise exception 'La partida ya ha terminado' using errcode = 'P0002';
  end if;

  insert into public.tron_reports (match_id, player_id, x_score, o_score)
  values (m.id, auth.uid(), report_tron_result.x_score, report_tron_result.o_score)
  on conflict do nothing;

  select * into rival_report from public.tron_reports r
  where r.match_id = m.id and r.player_id <> auth.uid();

  if rival_report.match_id is null then
    return 'waiting';
  end if;

  if rival_report.x_score = report_tron_result.x_score and rival_report.o_score = report_tron_result.o_score then
    update public.matches
    set status = 'finished', end_reason = 'points',
        winner = case when report_tron_result.x_score = 3 then 'x' else 'o' end,
        moves = array[report_tron_result.x_score, report_tron_result.o_score]::smallint[],
        updated_at = now()
    where id = m.id
    returning * into m;
    perform private.award_match_xp(m);
    return 'finished';
  end if;

  update public.matches
  set status = 'finished', end_reason = 'disputed', winner = null, updated_at = now()
  where id = m.id;
  return 'disputed';
end;
$$;

revoke execute on function public.report_tron_result(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.report_tron_result(uuid, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Canal privado de Realtime: solo los dos jugadores
-- ---------------------------------------------------------------------------

-- security definer: las políticas de Realtime se evalúan con el rol del usuario.
create function private.can_join_tron(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select topic ~ '^tron:[0-9a-f-]{36}$' and exists (
    select 1 from public.matches m
    where m.id = substring(topic from 6)::uuid
      and m.game = 'tron'
      and auth.uid() in (m.player_x, m.player_o)
  );
$$;

grant execute on function private.can_join_tron(text) to authenticated;

create policy "Solo los jugadores reciben el tron"
  on realtime.messages for select
  to authenticated
  using (private.can_join_tron(realtime.topic()));

create policy "Solo los jugadores emiten en el tron"
  on realtime.messages for insert
  to authenticated
  with check (private.can_join_tron(realtime.topic()));

-- ---------------------------------------------------------------------------
-- Avisos y chat
-- ---------------------------------------------------------------------------

-- "Te toca": como el pong, una partida aceptada está pendiente hasta que la juegas.
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
         when m.game = 'tron' then not exists (
           select 1 from public.tron_reports r where r.match_id = m.id and r.player_id = auth.uid()
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
      when 'tron' then 'Reto al Tron'
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
