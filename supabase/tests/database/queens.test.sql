begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9b000000000a', 'a@queens.local', '{"username": "qn_ana"}'),
  ('00000000-0000-0000-0000-9b000000000b', 'b@queens.local', '{"username": "qn_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

insert into public.game_runs (user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-9b000000000a', 'queens-hard', 1, 'finished', 200000, now()),
  ('00000000-0000-0000-0000-9b000000000b', 'queens-hard', 2, 'finished', 95000, now());

select results_eq(
  $$ select username, score from public.get_leaderboard('queens-hard') where username like 'qn_%' $$,
  $$ values ('qn_bob'::text, 95000), ('qn_ana'::text, 200000) $$,
  'en Reinas gana el menor tiempo');

set local role service_role;
insert into public.game_runs (id, user_id, game, seed) values
  ('00000000-0000-0000-0000-9b00000000f1', '00000000-0000-0000-0000-9b000000000a', 'queens-medium', 9);
select public.finish_run('00000000-0000-0000-0000-9b00000000f1', '02461357', 60000, 8);
reset role;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-9b000000000a'), 8,
  'resolver un tablero medio da 8 de XP');

select pg_temp.login('00000000-0000-0000-0000-9b000000000a');
select lives_ok($$ select * from public.start_run('queens-easy') $$, 'se puede empezar un tablero de reinas');
select throws_ok($$ select * from public.start_run('queens-imposible') $$, '23514', null, 'solo tamaños conocidos');
select lives_ok($$ select public.pause_run((select id from public.game_runs where user_id = auth.uid() and game = 'queens-easy' and status = 'playing')) $$,
  'y se puede pausar, porque va por tiempo');
reset role;

select * from finish();
rollback;
