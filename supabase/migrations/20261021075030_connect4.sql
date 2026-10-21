-- 4 en raya ('connect4'): por turnos como el 3 en raya. Los movimientos son
-- la columna de cada jugada (0-6) y el servidor de Next los valida con
-- @repo/games/connect4 antes de guardarlos con apply_match_move, igual que
-- en el 3 en raya. Retos, chat, avisos, XP y ranking son los comunes.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tictactoe', 'connect4', 'rps', 'rpsls', 'pong'));

-- "Te toca": como en el 3 en raya, X mueve con un número par de movimientos y O con uno impar.
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
      when 'connect4' then 'Reto al 4 en raya'
      else 'Reto al 3 en raya'
    end,
    'match',
    new.id
  );
  return new;
end;
$$;
