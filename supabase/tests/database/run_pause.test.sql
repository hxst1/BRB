begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9a000000000a', 'a@pause.local', '{"username": "pz_ana"}'),
  ('00000000-0000-0000-0000-9a000000000b', 'b@pause.local', '{"username": "pz_bob"}');

insert into public.game_runs (id, user_id, game, seed) values
  ('00000000-0000-0000-0000-9a00000000f1', '00000000-0000-0000-0000-9a000000000a', 'sudoku-easy', 1),
  ('00000000-0000-0000-0000-9a00000000f2', '00000000-0000-0000-0000-9a000000000a', '2048', 2);

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.run(id uuid) returns public.game_runs language sql as $$
  select * from public.game_runs where game_runs.id = run.id;
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-9a000000000b');
select public.pause_run('00000000-0000-0000-0000-9a00000000f1');
reset role;
select is((pg_temp.run('00000000-0000-0000-0000-9a00000000f1')).paused_at, null, 'no se puede pausar la partida de otro');

select pg_temp.login('00000000-0000-0000-0000-9a000000000a');
select public.pause_run('00000000-0000-0000-0000-9a00000000f2');
reset role;
select is((pg_temp.run('00000000-0000-0000-0000-9a00000000f2')).paused_at, null, 'el 2048 no va por tiempo: no se pausa');

select pg_temp.login('00000000-0000-0000-0000-9a000000000a');
select public.pause_run('00000000-0000-0000-0000-9a00000000f1');
reset role;
select isnt((pg_temp.run('00000000-0000-0000-0000-9a00000000f1')).paused_at, null, 'el sudoku se pausa');

-- Una pausa de 90 segundos (se adelanta su inicio para no esperar).
update public.game_runs set paused_at = now() - interval '90 seconds' where id = '00000000-0000-0000-0000-9a00000000f1';
select pg_temp.login('00000000-0000-0000-0000-9a000000000a');
select public.pause_run('00000000-0000-0000-0000-9a00000000f1');
reset role;
select is((pg_temp.run('00000000-0000-0000-0000-9a00000000f1')).paused_at, now() - interval '90 seconds',
  'pausar otra vez no reinicia la pausa');

select pg_temp.login('00000000-0000-0000-0000-9a000000000a');
select public.resume_run('00000000-0000-0000-0000-9a00000000f1');
select public.resume_run('00000000-0000-0000-0000-9a00000000f1');
reset role;
select is((pg_temp.run('00000000-0000-0000-0000-9a00000000f1')).paused_ms, 90000::bigint, 'al seguir se suman los 90 s (y seguir dos veces no suma más)');
select is((pg_temp.run('00000000-0000-0000-0000-9a00000000f1')).paused_at, null, 'y deja de estar en pausa');

update public.game_runs set status = 'finished', score = 1000, finished_at = now() where id = '00000000-0000-0000-0000-9a00000000f1';
select pg_temp.login('00000000-0000-0000-0000-9a000000000a');
select public.pause_run('00000000-0000-0000-0000-9a00000000f1');
reset role;
select is((pg_temp.run('00000000-0000-0000-0000-9a00000000f1')).paused_at, null, 'una partida terminada no se pausa');

set local role anon;
select throws_ok($$ select public.pause_run('00000000-0000-0000-0000-9a00000000f1') $$, '42501', null, 'sin sesión, no');
reset role;

select * from finish();
rollback;
