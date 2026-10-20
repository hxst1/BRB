-- Piedra, papel o tijera ('rps') y su variante con lagarto y Spock ('rpsls').
--
-- Usan la tabla de partidas del 3 en raya, pero los dos jugadores eligen a la
-- vez: la elección de cada ronda se guarda en match_choices, que cada uno solo
-- puede leer para sí mismo. Cuando están las dos, el servidor resuelve la
-- ronda (con @repo/games) y la añade a matches.moves, que ya es pública.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check check (game in ('tictactoe', 'rps', 'rpsls'));

-- 'rounds': ganada por rondas (piedra, papel o tijera).
alter table public.matches drop constraint matches_end_reason_check;
alter table public.matches add constraint matches_end_reason_check check (end_reason in ('line', 'rounds', 'draw', 'resign'));

create table public.match_choices (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  round integer not null check (round >= 0),
  choice smallint not null check (choice between 0 and 4),
  created_at timestamptz not null default now(),
  primary key (match_id, player_id, round)
);

alter table public.match_choices enable row level security;

-- Cada uno solo ve lo que ha elegido él: así nadie puede mirar antes de elegir.
create policy "Cada jugador ve solo sus elecciones"
  on public.match_choices for select
  to authenticated
  using ((select auth.uid()) = player_id);

revoke all on public.match_choices from anon, authenticated;
grant select on public.match_choices to authenticated;

-- Registra la elección de un jugador para la ronda en curso (solo el
-- servidor, que ya ha validado quién llama). Devuelve la elección del rival
-- para esa ronda si ya la había hecho, o null si hay que esperarle.
create function public.submit_match_choice(match_id uuid, player_id uuid, choice smallint)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  current_round integer;
  rival uuid;
  rival_choice smallint;
begin
  -- Bloquea la partida: las dos elecciones de una ronda se serializan.
  select * into m from public.matches where id = match_id for update;

  if m.id is null or m.status <> 'active' or m.game not in ('rps', 'rpsls') then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
  if player_id not in (m.player_x, m.player_o) then
    raise exception 'No juegas en esta partida' using errcode = 'P0002';
  end if;

  current_round := cardinality(m.moves) / 2;
  rival := case when player_id = m.player_x then m.player_o else m.player_x end;

  insert into public.match_choices (match_id, player_id, round, choice)
  values (m.id, submit_match_choice.player_id, current_round, submit_match_choice.choice)
  on conflict do nothing;

  if not found then
    raise exception 'Ya has elegido en esta ronda' using errcode = 'P0001', hint = 'already_chosen';
  end if;

  select c.choice into rival_choice from public.match_choices c
  where c.match_id = m.id and c.player_id = rival and c.round = current_round;

  return rival_choice;
end;
$$;

-- Igual que antes, pero ganar por rondas también da XP.
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

  -- Tope de XP: solo las primeras partidas del día entre la misma pareja
  -- cuentan, para que dos amigos no puedan farmear empates.
  if (
    select count(*) from public.matches x
    where x.game = m.game
      and least(x.player_x, x.player_o) = least(m.player_x, m.player_o)
      and greatest(x.player_x, x.player_o) = greatest(m.player_x, m.player_o)
      and x.status = 'finished'
      and x.end_reason in ('line', 'rounds', 'draw')
      and x.updated_at > now() - interval '1 day'
  ) > 5 then
    return;
  end if;

  if m.end_reason in ('line', 'rounds') then
    perform private.award_xp(case when m.winner = 'x' then m.player_x else m.player_o end, 10);
    perform private.award_xp(case when m.winner = 'x' then m.player_o else m.player_x end, 2);
  elsif m.end_reason = 'draw' then
    perform private.award_xp(m.player_x, 4);
    perform private.award_xp(m.player_o, 4);
  end if;
end;
$$;

-- "Te toca" en piedra, papel o tijera: no has elegido en la ronda en curso.
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

-- La tarjeta del chat dice a qué se reta.
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
      else 'Reto al 3 en raya'
    end,
    'match',
    new.id
  );
  return new;
end;
$$;

revoke execute on function public.submit_match_choice(uuid, uuid, smallint), public.get_pending_counts()
from public, anon, authenticated;
grant execute on function public.submit_match_choice(uuid, uuid, smallint) to service_role;
grant execute on function public.get_pending_counts() to authenticated;
