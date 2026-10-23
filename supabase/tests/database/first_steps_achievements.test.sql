begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-f6000000000a', 'a@fsa.local', '{"username": "fsa_ana"}'),
  ('00000000-0000-0000-0000-f6000000000b', 'b@fsa.local', '{"username": "fsa_bob"}');

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

-- --- Primeros pasos -----------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-f6000000000a');
select results_eq($$ select monster, friend, daily from public.get_my_first_steps() $$,
  $$ values (false, false, false) $$, 'una cuenta nueva no ha hecho ningún paso');

update public.profiles set avatar_parts = '{"body": "square"}' where id = auth.uid();
select results_eq($$ select monster from public.get_my_first_steps() $$, $$ values (true) $$, 'elegir algo en el editor cuenta');

select pg_temp.logout();
insert into public.friendships (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-f6000000000a', '00000000-0000-0000-0000-f6000000000b', 'pending');
select pg_temp.login('00000000-0000-0000-0000-f6000000000b');
select results_eq($$ select friend from public.get_my_first_steps() $$, $$ values (false) $$,
  'recibir una solicitud no cuenta como añadir un amigo');
select pg_temp.login('00000000-0000-0000-0000-f6000000000a');
select results_eq($$ select friend from public.get_my_first_steps() $$, $$ values (true) $$, 'enviarla sí');
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000a', 'first-steps'), false, 'con dos pasos aún no hay logro');

select pg_temp.logout();
insert into public.game_runs (user_id, game, seed, daily) values
  ('00000000-0000-0000-0000-f6000000000a', 'sudoku-medium', 1, current_date);
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000a', 'first-steps'), true, 'empezar el reto diario completa el logro');

set local role anon;
select throws_ok($$ select * from public.get_my_first_steps() $$, '42501', null, 'sin sesión no se puede consultar');
reset role;

-- --- Explorador: los 6 juegos en solitario --------------------------------------------------

insert into public.game_runs (user_id, game, seed, status, score, finished_at)
select '00000000-0000-0000-0000-f6000000000b', g, 1, 'playing', null, null
from unnest(array['2048', 'snake', 'lightsout', 'minesweeper-easy', 'sudoku-hard']) g;
update public.game_runs set status = 'finished', score = 10, finished_at = now()
where user_id = '00000000-0000-0000-0000-f6000000000b';
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000b', 'explorer'), false, 'con 5 juegos aún no');

insert into public.game_runs (user_id, game, seed) values ('00000000-0000-0000-0000-f6000000000b', 'minesweeper-hard', 2);
update public.game_runs set status = 'finished', score = 10, finished_at = now()
where user_id = '00000000-0000-0000-0000-f6000000000b' and game = 'minesweeper-hard';
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000b', 'explorer'), false, 'otra dificultad del mismo juego no suma');

insert into public.wordle_games (user_id, day, guesses, patterns, solved, lang) values
  ('00000000-0000-0000-0000-f6000000000b', current_date, '{}', '{}', false, 'es');
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000b', 'explorer'), false, 'un Wordle a medias no cuenta');
update public.wordle_games set finished_at = now() where user_id = '00000000-0000-0000-0000-f6000000000b';
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000b', 'explorer'), true, 'terminar el Wordle, aunque sin acertar, completa los 6');

-- --- 10 partidas contra amigos --------------------------------------------------------------

-- Solo cabe una partida abierta por pareja y juego: se crean y terminan de una en una.
create function pg_temp.play(reason text, winner text) returns void language plpgsql as $$
declare
  match_id uuid;
begin
  insert into public.matches (game, player_x, player_o, created_by, status)
  values ('tictactoe', '00000000-0000-0000-0000-f6000000000a', '00000000-0000-0000-0000-f6000000000b',
          '00000000-0000-0000-0000-f6000000000a', 'active')
  returning id into match_id;
  update public.matches m set status = 'finished', end_reason = reason, winner = play.winner where m.id = match_id;
end;
$$;

select pg_temp.play('resign', 'x');
select pg_temp.play('draw', null) from generate_series(1, 9);
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000a', 'matches-10'), false, 'las abandonadas no cuentan: 9 de 10');
select is(
  (select progress from private.achievement_progress('00000000-0000-0000-0000-f6000000000b') where achievement = 'matches-10'), 9,
  'cuentan para los dos jugadores');
select pg_temp.play('line', 'o');
select is(pg_temp.has('00000000-0000-0000-0000-f6000000000a', 'matches-10'), true, 'la décima da el logro');

select * from finish();
rollback;
