-- Datos del panel de inicio y del aviso de la cabecera.

-- Cosas que esperan al usuario: partidas en las que le toca, retos recibidos y
-- solicitudes de amistad. Barata a propósito: se consulta en cada página.
create function public.get_pending_counts()
returns table (my_turn integer, match_invites integer, friend_requests integer)
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
     where f.status = 'pending' and f.addressee_id = auth.uid());
$$;

-- Mejor puntuación del usuario en un juego en solitario y su puesto en el
-- ranking global y en el de amigos (mismo criterio que get_leaderboard).
create function public.get_my_standing(game text)
returns table (best_score integer, global_rank integer, global_players integer, friends_rank integer, friends_players integer)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select r.user_id, max(r.score) as score
    from public.game_runs r
    where r.game = get_my_standing.game and r.status = 'finished'
    group by r.user_id
  ),
  mine as (
    select score from best where user_id = auth.uid()
  ),
  circle as (
    select b.* from best b
    where b.user_id = auth.uid() or private.are_friends(auth.uid(), b.user_id)
  )
  select
    (select score from mine),
    (select count(*)::integer + 1 from best where score > (select score from mine)),
    (select count(*)::integer from best),
    (select count(*)::integer + 1 from circle where score > (select score from mine)),
    (select count(*)::integer from circle);
$$;

revoke execute on function public.get_pending_counts(), public.get_my_standing(text) from public, anon, authenticated;
grant execute on function public.get_pending_counts(), public.get_my_standing(text) to authenticated;
