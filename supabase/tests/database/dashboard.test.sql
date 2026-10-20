begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-30000000000a', 'a@dash.local', '{"username": "d_ana"}'),
  ('00000000-0000-0000-0000-30000000000b', 'b@dash.local', '{"username": "d_bob"}'),
  ('00000000-0000-0000-0000-30000000000c', 'c@dash.local', '{"username": "d_carla"}'),
  ('00000000-0000-0000-0000-30000000000d', 'd@dash.local', '{"username": "d_dani"}');

-- A y B amigos; C le ha pedido amistad a A; D es un desconocido.
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-30000000000a', '00000000-0000-0000-0000-30000000000b', 'accepted', now()),
  ('00000000-0000-0000-0000-30000000000c', '00000000-0000-0000-0000-30000000000a', 'pending', null);

-- Partidas: A juega con X y le toca (0 movimientos); B ha retado a A en otra pareja ficticia.
insert into public.matches (game, player_x, player_o, created_by, status, moves) values
  ('tictactoe', '00000000-0000-0000-0000-30000000000a', '00000000-0000-0000-0000-30000000000b',
   '00000000-0000-0000-0000-30000000000a', 'active', '{}'),
  ('tictactoe', '00000000-0000-0000-0000-30000000000c', '00000000-0000-0000-0000-30000000000a',
   '00000000-0000-0000-0000-30000000000c', 'pending', '{}');

-- Puntuaciones de 2048 (de un universo propio: el seed tiene otras).
insert into public.game_runs (user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-30000000000a', '2048', 1, 'finished', 900000, now()),
  ('00000000-0000-0000-0000-30000000000b', '2048', 2, 'finished', 950000, now()),
  ('00000000-0000-0000-0000-30000000000d', '2048', 3, 'finished', 990000, now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-30000000000a');
select is((select my_turn from public.get_pending_counts()), 1, 'cuenta las partidas en las que le toca');
select is((select match_invites from public.get_pending_counts()), 1, 'cuenta los retos recibidos');
select is((select friend_requests from public.get_pending_counts()), 1, 'cuenta las solicitudes de amistad');

select pg_temp.login('00000000-0000-0000-0000-30000000000b');
select is((select my_turn from public.get_pending_counts()), 0, 'a B no le toca: mueve X');

select pg_temp.login('00000000-0000-0000-0000-30000000000a');
select is((select best_score from public.get_my_standing('2048')), 900000, 'devuelve la mejor puntuación');
select is((select global_rank from public.get_my_standing('2048')), 3, 'puesto global: por detrás de B y D');
select is((select friends_rank from public.get_my_standing('2048')), 2, 'entre amigos solo cuenta B');
select is((select friends_players from public.get_my_standing('2048')), 2, 'el círculo son A y B');

select pg_temp.login('00000000-0000-0000-0000-30000000000c');
select is((select best_score from public.get_my_standing('2048')), null, 'sin partidas no hay puntuación');

select * from finish();
rollback;
