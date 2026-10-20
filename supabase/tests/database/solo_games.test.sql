begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-e0000000000a', 'a@snake.local', '{"username": "s_ana"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;

create temp table runs (game text primary key, id uuid);
grant all on runs to authenticated, service_role;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-e0000000000a');
insert into runs select 'snake', id from public.start_run('snake');
insert into runs select '2048', id from public.start_run('2048');
select is((select count(*) from public.game_runs where status = 'playing'), 2::bigint,
  'una partida de Snake en curso no abandona la del 2048');
select throws_ok($$ select * from public.start_run('tetris') $$, '23514', null, 'solo juegos conocidos');
select lives_ok($$ select * from public.start_run('lightsout') $$, 'también Lights Out');
reset role;

set local role service_role;
select public.finish_run((select id from runs where game = 'snake'), '3U', 120, 15);
reset role;

select pg_temp.login('00000000-0000-0000-0000-e0000000000a');
select results_eq($$ select username, score from public.get_leaderboard('snake') where username = 's_ana' $$,
  $$ values ('s_ana'::text, 120) $$, 'el ranking de Snake muestra la partida');
select is((select count(*) from public.get_leaderboard('2048') where username = 's_ana'), 0::bigint,
  'y no se mezcla con el del 2048');
select is((select best_score from public.get_my_standing('snake')), 120, 'el panel ve tu récord de Snake');
reset role;

select * from finish();
rollback;
