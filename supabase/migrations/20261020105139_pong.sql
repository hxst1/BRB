-- Pong en directo entre amigos.
--
-- Se juega por Realtime (Broadcast + Presence) en un canal privado
-- `pong:<id de la partida>` al que solo pueden entrar los dos jugadores. Uno
-- simula la física y retransmite; al acabar, los dos comunican el marcador y
-- la partida solo se da por ganada (con XP) si coinciden. Si no, queda en
-- disputa y sin XP.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tictactoe', 'rps', 'rpsls', 'pong'));

-- 'points': ganada por puntos (pong). 'disputed': los marcadores no coinciden.
alter table public.matches drop constraint matches_end_reason_check;
alter table public.matches add constraint matches_end_reason_check
  check (end_reason in ('line', 'rounds', 'points', 'draw', 'resign', 'disputed'));

-- ---------------------------------------------------------------------------
-- XP de una partida terminada (común a todos los juegos)
-- ---------------------------------------------------------------------------

create function private.award_match_xp(m public.matches)
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
      and x.end_reason in ('line', 'rounds', 'points', 'draw')
      and x.updated_at > now() - interval '1 day'
  ) > 5 then
    return;
  end if;

  if m.end_reason in ('line', 'rounds', 'points') then
    perform private.award_xp(case when m.winner = 'x' then m.player_x else m.player_o end, 10);
    perform private.award_xp(case when m.winner = 'x' then m.player_o else m.player_x end, 2);
  elsif m.end_reason = 'draw' then
    perform private.award_xp(m.player_x, 4);
    perform private.award_xp(m.player_o, 4);
  end if;
end;
$$;

create or replace function public.apply_match_move(
  match_id uuid,
  previous_count integer,
  moves smallint[],
  end_reason text default null,
  winner text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  update public.matches
  set moves = apply_match_move.moves,
      status = case when apply_match_move.end_reason is null then 'active' else 'finished' end,
      end_reason = apply_match_move.end_reason,
      winner = apply_match_move.winner,
      updated_at = now()
  where id = match_id
    and status = 'active'
    and cardinality(matches.moves) = previous_count
  returning * into m;

  if m.id is null then
    raise exception 'La partida ha cambiado' using errcode = 'P0002';
  end if;

  if m.status = 'finished' then
    perform private.award_match_xp(m);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resultado del pong
-- ---------------------------------------------------------------------------

create table public.pong_reports (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  x_score integer not null check (x_score between 0 and 5),
  o_score integer not null check (o_score between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (match_id, player_id),
  -- Una partida acaba cuando alguien llega a 5 (y solo uno).
  constraint pong_reports_one_winner check ((x_score = 5) <> (o_score = 5))
);

alter table public.pong_reports enable row level security;

create policy "Cada jugador ve su propio resultado"
  on public.pong_reports for select
  to authenticated
  using ((select auth.uid()) = player_id);

revoke all on public.pong_reports from anon, authenticated;
grant select on public.pong_reports to authenticated;

-- Devuelve 'waiting' (falta el otro), 'finished' o 'disputed'.
create function public.report_pong_result(match_id uuid, x_score integer, o_score integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  rival_report public.pong_reports;
begin
  -- Bloquea la partida para que los dos informes no se crucen.
  select * into m from public.matches where id = match_id for update;

  if m.id is null or m.game <> 'pong' or auth.uid() not in (m.player_x, m.player_o) then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
  if m.status <> 'active' then
    raise exception 'La partida ya ha terminado' using errcode = 'P0002';
  end if;

  insert into public.pong_reports (match_id, player_id, x_score, o_score)
  values (m.id, auth.uid(), report_pong_result.x_score, report_pong_result.o_score)
  on conflict do nothing;

  select * into rival_report from public.pong_reports r
  where r.match_id = m.id and r.player_id <> auth.uid();

  if rival_report.match_id is null then
    return 'waiting';
  end if;

  if rival_report.x_score = report_pong_result.x_score and rival_report.o_score = report_pong_result.o_score then
    update public.matches
    set status = 'finished', end_reason = 'points',
        winner = case when report_pong_result.x_score = 5 then 'x' else 'o' end,
        moves = array[report_pong_result.x_score, report_pong_result.o_score]::smallint[],
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

-- "Te toca": una partida de pong aceptada está pendiente hasta que la juegas.
drop function public.get_pending_counts();

create function public.get_pending_counts()
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
         -- 3 en raya: mueve X con un número par de movimientos y O con uno impar.
         when m.game = 'tictactoe' then
           (m.player_x = auth.uid() and cardinality(m.moves) % 2 = 0)
           or (m.player_o = auth.uid() and cardinality(m.moves) % 2 = 1)
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

-- La tarjeta del chat también para el pong.
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
      else 'Reto al 3 en raya'
    end,
    'match',
    new.id
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Canal privado de Realtime: solo los dos jugadores
-- ---------------------------------------------------------------------------

-- security definer: las políticas de Realtime se evalúan con el rol del usuario.
create function private.can_join_pong(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select topic ~ '^pong:[0-9a-f-]{36}$' and exists (
    select 1 from public.matches m
    where m.id = substring(topic from 6)::uuid
      and m.game = 'pong'
      and auth.uid() in (m.player_x, m.player_o)
  );
$$;

-- Las políticas se evalúan con el rol del usuario, que necesita entrar en el
-- esquema private para llamar a can_join_pong. Postgres concede EXECUTE a
-- PUBLIC en cada función nueva: se retira en todas las de private (también en
-- las futuras) y solo se deja esta. Los triggers y las funciones security
-- definer no dependen de ese permiso.
revoke execute on all functions in schema private from public;
alter default privileges in schema private revoke execute on functions from public;
grant usage on schema private to authenticated;
grant execute on function private.can_join_pong(text) to authenticated;

create policy "Solo los jugadores reciben el pong"
  on realtime.messages for select
  to authenticated
  using (private.can_join_pong(realtime.topic()));

create policy "Solo los jugadores emiten en el pong"
  on realtime.messages for insert
  to authenticated
  with check (private.can_join_pong(realtime.topic()));

revoke execute on function public.report_pong_result(uuid, integer, integer), public.get_pending_counts()
from public, anon, authenticated;
grant execute on function public.report_pong_result(uuid, integer, integer), public.get_pending_counts()
to authenticated;
