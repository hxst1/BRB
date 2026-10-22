begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ac000000000a', 'a@ach.local', '{"username": "ach_ana"}'),
  ('00000000-0000-0000-0000-ac000000000b', 'b@ach.local', '{"username": "ach_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.has(player uuid, id text) returns boolean language sql as $$
  select exists (select 1 from public.user_achievements where user_id = player and achievement = id);
$$;
discard plans;

-- --- Partidas en solitario -------------------------------------------------------------

select is(pg_temp.has('00000000-0000-0000-0000-ac000000000a', 'first-run'), false, 'sin partidas no hay logros');

insert into public.game_runs (id, user_id, game, seed, status) values
  ('00000000-0000-0000-0000-ac00000000f1', '00000000-0000-0000-0000-ac000000000a', '2048', 1, 'playing');
update public.game_runs set status = 'finished', score = 30000, max_tile = 2048, finished_at = now()
where id = '00000000-0000-0000-0000-ac00000000f1';
select is(pg_temp.has('00000000-0000-0000-0000-ac000000000a', 'first-run'), true, 'terminar una partida da "primera partida"');
select is(pg_temp.has('00000000-0000-0000-0000-ac000000000a', 'tile-2048'), true, 'y llegar a 2048 su logro');

insert into public.game_runs (id, user_id, game, seed, status) values
  ('00000000-0000-0000-0000-ac00000000f2', '00000000-0000-0000-0000-ac000000000a', 'snake', 1, 'playing');
update public.game_runs set status = 'rejected', score = 900, rejection_reason = 'test', finished_at = now()
where id = '00000000-0000-0000-0000-ac00000000f2';
select is(pg_temp.has('00000000-0000-0000-0000-ac000000000a', 'snake-30'), false, 'las partidas rechazadas no cuentan');

-- --- Racha, amigos y partidas contra amigos ---------------------------------------------

update public.profiles set streak_best = 7 where id = '00000000-0000-0000-0000-ac000000000a';
select is(pg_temp.has('00000000-0000-0000-0000-ac000000000a', 'streak-7'), true, 'una racha de 7 días da su logro');
select is(pg_temp.has('00000000-0000-0000-0000-ac000000000a', 'streak-30'), false, 'pero no el de 30');

insert into public.matches (id, game, player_x, player_o, created_by, status) values
  ('00000000-0000-0000-0000-ac00000000e1', 'tictactoe', '00000000-0000-0000-0000-ac000000000a',
   '00000000-0000-0000-0000-ac000000000b', '00000000-0000-0000-0000-ac000000000a', 'active');
update public.matches set status = 'finished', winner = 'o', end_reason = 'line'
where id = '00000000-0000-0000-0000-ac00000000e1';
select is((select progress from private.achievement_progress('00000000-0000-0000-0000-ac000000000b') where achievement = 'winner-5'),
  1, 'ganar suma un rival vencido');
select is((select progress from private.achievement_progress('00000000-0000-0000-0000-ac000000000a') where achievement = 'winner-5'),
  0, 'perder no suma');

-- --- Ropa bloqueada ----------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-ac000000000a');
select lives_ok($$ update public.profiles set avatar_parts = '{"top": "flower", "palette": "ultra"}' where id = auth.uid() $$,
  'con el logro, puede ponerse su ropa');
select throws_ok($$ update public.profiles set avatar_parts = '{"top": "wizard"}' where id = auth.uid() $$,
  'P0001', null, 'sin el logro, no');
select lives_ok($$ update public.profiles set avatar_parts = '{"top": "horns"}' where id = auth.uid() $$, 'la ropa libre sigue libre');
select throws_ok($$ insert into public.user_achievements (user_id, achievement) values (auth.uid(), 'sudoku-hard') $$,
  '42501', null, 'nadie se da logros a sí mismo');

select is((select count(*) from public.get_my_achievements() where unlocked_at is not null)::int, 3,
  'cada uno ve sus logros y su progreso');

select pg_temp.login('00000000-0000-0000-0000-ac000000000b');
select is((select count(*) from public.user_achievements where user_id = '00000000-0000-0000-0000-ac000000000a')::int, 0,
  'y no los de los demás');

select * from finish();
rollback;
