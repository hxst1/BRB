begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-3e000000000a', 'a@ms.local', '{"username": "ms_ana"}'),
  ('00000000-0000-0000-0000-3e000000000b', 'b@ms.local', '{"username": "ms_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

-- Partidas ya terminadas: en el buscaminas la puntuación es el tiempo (ms).
insert into public.game_runs (user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-3e000000000a', 'minesweeper-medium', 1, 'finished', 95000, now()),
  ('00000000-0000-0000-0000-3e000000000a', 'minesweeper-medium', 2, 'finished', 61000, now()),
  ('00000000-0000-0000-0000-3e000000000b', 'minesweeper-medium', 3, 'finished', 70000, now()),
  ('00000000-0000-0000-0000-3e000000000a', '2048', 4, 'finished', 100, now()),
  ('00000000-0000-0000-0000-3e000000000b', '2048', 5, 'finished', 900, now());

select results_eq(
  $$ select username, score from public.get_leaderboard('minesweeper-medium') where username like 'ms_%' $$,
  $$ values ('ms_ana'::text, 61000), ('ms_bob'::text, 70000) $$,
  'en el buscaminas gana el menor tiempo, y cuenta el mejor de cada uno');
select results_eq(
  $$ select username from public.get_leaderboard('2048') where username like 'ms_%' $$,
  $$ values ('ms_bob'::text), ('ms_ana'::text) $$,
  'el 2048 sigue ordenando de mayor a menor');

-- Puesto esperado de bob: 1 + quienes tienen un tiempo mejor (calculado sin RLS).
create temp table expected as
  select 1 + count(*)::integer as rank from (
    select user_id from public.game_runs
    where game = 'minesweeper-medium' and status = 'finished'
    group by user_id having min(score) < 70000) faster;
grant select on expected to authenticated;

select pg_temp.login('00000000-0000-0000-0000-3e000000000b');
select results_eq(
  $$ select best_score, global_rank from public.get_my_standing('minesweeper-medium') $$,
  $$ select 70000, rank from expected $$,
  'tu récord es tu mejor tiempo y tu puesto cuenta quién ha tardado menos');
select is((select best_score from public.get_my_standing('2048')), 900, 'en el 2048 el récord sigue siendo el máximo');
reset role;

-- XP por dificultad al cerrar la partida.
set local role service_role;
insert into public.game_runs (id, user_id, game, seed) values
  ('00000000-0000-0000-0000-3e00000000f1', '00000000-0000-0000-0000-3e000000000a', 'minesweeper-hard', 9);
select public.finish_run('00000000-0000-0000-0000-3e00000000f1', '1,2', 300000, 2);
reset role;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-3e000000000a'), 20,
  'ganar en difícil da 20 de XP, no algo proporcional al tiempo');

select throws_ok($$ insert into public.game_runs (user_id, game, seed) values ('00000000-0000-0000-0000-3e000000000a', 'minesweeper-imposible', 1) $$,
  '23514', null, 'solo dificultades conocidas');

select pg_temp.login('00000000-0000-0000-0000-3e000000000a');
select lives_ok($$ select * from public.start_run('minesweeper-easy') $$, 'se puede empezar una partida');
reset role;

select * from finish();
rollback;
