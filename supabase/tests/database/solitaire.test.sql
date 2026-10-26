begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-5c000000000a', 'a@sol.local', '{"username": "sol_ana"}'),
  ('00000000-0000-0000-0000-5c000000000b', 'b@sol.local', '{"username": "sol_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

insert into public.game_runs (user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-5c000000000a', 'solitaire', 1, 'finished', 300000, now()),
  ('00000000-0000-0000-0000-5c000000000b', 'solitaire', 2, 'finished', 180000, now());

select results_eq(
  $$ select username, score from public.get_leaderboard('solitaire') where username like 'sol_%' $$,
  $$ values ('sol_bob'::text, 180000), ('sol_ana'::text, 300000) $$,
  'en el solitario gana el menor tiempo');

set local role service_role;
insert into public.game_runs (id, user_id, game, seed) values
  ('00000000-0000-0000-0000-5c00000000f1', '00000000-0000-0000-0000-5c000000000a', 'solitaire', 9);
select public.finish_run('00000000-0000-0000-0000-5c00000000f1', 's', 240000, 140);
reset role;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-5c000000000a'), 10,
  'ganar un solitario da 10 de XP');

select pg_temp.login('00000000-0000-0000-0000-5c000000000a');
select lives_ok($$ select * from public.start_run('solitaire') $$, 'se puede empezar un solitario');
reset role;

select is(private.lower_is_better('solitaire'), true, 'el solitario se ordena por tiempo');

select * from finish();
rollback;
