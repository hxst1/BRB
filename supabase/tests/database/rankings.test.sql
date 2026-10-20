begin;
select plan(9);

-- Universo propio: XP muy alta para que el seed no interfiera en los puestos.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-70000000000a', 'a@rank.local', '{"username": "k_ana"}'),
  ('00000000-0000-0000-0000-70000000000b', 'b@rank.local', '{"username": "k_bob"}'),
  ('00000000-0000-0000-0000-70000000000c', 'c@rank.local', '{"username": "k_carla"}');

update public.profiles set xp = 900000 where id = '00000000-0000-0000-0000-70000000000a';
update public.profiles set xp = 950000 where id = '00000000-0000-0000-0000-70000000000b';
update public.profiles set xp = 990000 where id = '00000000-0000-0000-0000-70000000000c';

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-70000000000a', '00000000-0000-0000-0000-70000000000b', 'accepted', now());

-- A gana dos veces a B al 3 en raya y B gana una; una de piedra, papel o tijera para B.
insert into public.matches (game, player_x, player_o, created_by, status, moves, winner, end_reason) values
  ('tictactoe', '00000000-0000-0000-0000-70000000000a', '00000000-0000-0000-0000-70000000000b', '00000000-0000-0000-0000-70000000000a', 'finished', '{}', 'x', 'line'),
  ('tictactoe', '00000000-0000-0000-0000-70000000000b', '00000000-0000-0000-0000-70000000000a', '00000000-0000-0000-0000-70000000000b', 'finished', '{}', 'o', 'line'),
  ('tictactoe', '00000000-0000-0000-0000-70000000000b', '00000000-0000-0000-0000-70000000000a', '00000000-0000-0000-0000-70000000000b', 'finished', '{}', 'x', 'line'),
  ('rpsls', '00000000-0000-0000-0000-70000000000a', '00000000-0000-0000-0000-70000000000b', '00000000-0000-0000-0000-70000000000a', 'finished', '{}', 'o', 'rounds');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-70000000000a');

select is((select rank from public.get_level_leaderboard() where user_id = '00000000-0000-0000-0000-70000000000c'),
  1::bigint, 'nivel: gana quien más XP tiene');
select is((select rank from public.get_level_leaderboard('friends') where user_id = '00000000-0000-0000-0000-70000000000a'),
  2::bigint, 'nivel entre amigos: A va detrás de B');
select is((select count(*) from public.get_level_leaderboard('friends') where user_id = '00000000-0000-0000-0000-70000000000c')::int,
  0, 'C no es amiga de A: no sale en su ranking de amigos');
select is((select count(*) from public.get_level_leaderboard('global', 1) where user_id = auth.uid())::int,
  1, 'aunque no esté en el top, el usuario ve su fila');

select is((select wins || '/' || played from public.get_match_leaderboard('{tictactoe}') where user_id = auth.uid()),
  '2/3', '3 en raya: cuenta victorias y partidas');
select is((select rank from public.get_match_leaderboard('{tictactoe}') where user_id = auth.uid()),
  1::bigint, 'A va primera con más victorias');
select is((select wins from public.get_match_leaderboard('{rps,rpsls}') where user_id = '00000000-0000-0000-0000-70000000000b'),
  1, 'piedra, papel o tijera junta las dos variantes');
select is((select count(*) from public.get_match_leaderboard('{tictactoe}', 'global', 'week'))::int >= 2,
  true, 'filtra por semana');
select throws_ok($$ select * from public.get_match_leaderboard('{tictactoe}', 'todos') $$,
  '22023', null, 'rechaza filtros no válidos');

select * from finish();
rollback;
