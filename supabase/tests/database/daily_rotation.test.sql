begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-d7000000000a', 'a@rot.local', '{"username": "rot_ana"}'),
  ('00000000-0000-0000-0000-d7000000000b', 'b@rot.local', '{"username": "rot_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

-- Semana del lunes 1 de marzo de 2027.
select is((select game from private.daily_challenge('2027-03-01')), '2048', 'el lunes, 2048');
select is((select game from private.daily_challenge('2027-03-02')), 'snake', 'el martes, Snake');
select is((select game from private.daily_challenge('2027-03-03')), 'minesweeper-medium', 'el miércoles, Buscaminas medio');
select is((select game from private.daily_challenge('2027-03-04')), 'lightsout', 'el jueves, Lights Out');
select is((select game from private.daily_challenge('2027-03-05')), 'sudoku-medium', 'el viernes, Sudoku medio');
select ok((select game from private.daily_challenge('2027-03-06'))
  = any (array['2048', 'snake', 'minesweeper-medium', 'lightsout', 'sudoku-medium']), 'el fin de semana, uno de los cinco');
select is((select game || seed from private.daily_challenge('2027-03-06')), (select game || seed from private.daily_challenge('2027-03-06')),
  'el reto de un día no cambia');

-- El reto de hoy es el juego que toque, y lo dice.
select pg_temp.login('00000000-0000-0000-0000-d7000000000a');
select is((select game from public.start_daily_run()), (select game from public.get_daily_info()),
  'start_daily_run empieza el juego de hoy');
select is((select game from public.get_my_daily()), (select game from public.get_daily_info()), 'y el resumen dice cuál es');
select lives_ok($$ select public.abandon_run((select id from public.game_runs where user_id = auth.uid() and daily is not null)) $$,
  'perder da por terminada la partida');
select is((select status from public.get_my_daily()), 'abandoned', 'y el reto queda como intento usado');
select pg_temp.logout();
select set_config('test.run', (select id::text from public.game_runs where user_id = '00000000-0000-0000-0000-d7000000000a' and daily is not null), true);
update public.game_runs set status = 'playing' where id = current_setting('test.run')::uuid;
select pg_temp.login('00000000-0000-0000-0000-d7000000000b');
select throws_ok($$ select public.abandon_run(current_setting('test.run')::uuid) $$,
  'P0002', null, 'nadie puede dar por perdida la partida de otro');
select pg_temp.logout();

set local role anon;
select lives_ok($$ select * from public.get_daily_info() $$, 'qué toca hoy se puede ver sin sesión');
reset role;

-- En los juegos de tiempo gana el menor: el ranking del día lo respeta.
delete from public.game_runs where daily = private.game_day();
insert into public.game_runs (user_id, game, seed, status, score, finished_at, daily, daily_slot) values
  ('00000000-0000-0000-0000-d7000000000a', 'sudoku-medium', 1, 'finished', 900000, now(), private.game_day(), 'puzzle'),
  ('00000000-0000-0000-0000-d7000000000b', 'sudoku-medium', 1, 'finished', 400000, now(), private.game_day(), 'puzzle');
select is((select username from public.get_daily_leaderboard(game => 'sudoku-medium') where rank = 1), 'rot_bob',
  'en un día de sudoku, el más rápido va primero');

select * from finish();
rollback;
