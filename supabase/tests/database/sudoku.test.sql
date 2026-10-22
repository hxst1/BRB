begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-5d000000000a', 'a@sd.local', '{"username": "sd_ana"}'),
  ('00000000-0000-0000-0000-5d000000000b', 'b@sd.local', '{"username": "sd_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

insert into public.game_runs (user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-5d000000000a', 'sudoku-hard', 1, 'finished', 600000, now()),
  ('00000000-0000-0000-0000-5d000000000b', 'sudoku-hard', 2, 'finished', 420000, now());

select results_eq(
  $$ select username, score from public.get_leaderboard('sudoku-hard') where username like 'sd_%' $$,
  $$ values ('sd_bob'::text, 420000), ('sd_ana'::text, 600000) $$,
  'en el sudoku gana el menor tiempo');

set local role service_role;
insert into public.game_runs (id, user_id, game, seed) values
  ('00000000-0000-0000-0000-5d00000000f1', '00000000-0000-0000-0000-5d000000000a', 'sudoku-medium', 9);
select public.finish_run('00000000-0000-0000-0000-5d00000000f1', repeat('1', 81), 300000, 49);
reset role;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-5d000000000a'), 12,
  'resolver un medio da 12 de XP');

select pg_temp.login('00000000-0000-0000-0000-5d000000000a');
select lives_ok($$ select * from public.start_run('sudoku-easy') $$, 'se puede empezar un sudoku');
select throws_ok($$ select * from public.start_run('sudoku-imposible') $$, '23514', null, 'solo dificultades conocidas');
reset role;

select * from finish();
rollback;
