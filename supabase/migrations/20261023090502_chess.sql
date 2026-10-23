-- Ajedrez ('chess'): por turnos como el 3 y el 4 en raya. Cada movimiento es
-- un número (origen × 64 + destino, más la pieza de coronación × 4096) y el
-- servidor de Next lo valida con @repo/games/chess (chess.js) antes de
-- guardarlo con apply_match_move. Blancas = X, que mueve primero. Acaba por
-- jaque mate ('checkmate'), tablas ('draw': ahogado, repetición, 50 jugadas o
-- material insuficiente) o rendición. Retos, chat, avisos, XP y ranking son los comunes.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tictactoe', 'connect4', 'battleship', 'rps', 'rpsls', 'pong', 'tron', 'chess'));

alter table public.matches drop constraint matches_end_reason_check;
alter table public.matches add constraint matches_end_reason_check
  check (end_reason in ('line', 'rounds', 'points', 'fleet', 'checkmate', 'draw', 'resign', 'disputed'));

-- "Te toca": como en el 3 en raya, X con un número par de movimientos y O con uno impar.
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
         when m.game in ('tictactoe', 'connect4', 'chess') then
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
      else 'Reto al 3 en raya'
    end,
    'match',
    new.id
  );
  return new;
end;
$$;

-- XP: el jaque mate cuenta como victoria.
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
      and x.end_reason in ('line', 'rounds', 'points', 'fleet', 'checkmate', 'draw')
      and x.updated_at > now() - interval '1 day'
  ) > 5 then
    return;
  end if;

  if m.end_reason in ('line', 'rounds', 'points', 'fleet', 'checkmate') then
    perform private.award_xp(case when m.winner = 'x' then m.player_x else m.player_o end, 10);
    perform private.award_xp(case when m.winner = 'x' then m.player_o else m.player_x end, 2);
  elsif m.end_reason = 'draw' then
    perform private.award_xp(m.player_x, 4);
    perform private.award_xp(m.player_o, 4);
  end if;
end;
$$;
