begin;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-d0000000000a', 'a@dc.local', '{"username": "dc_ana"}'),
  ('00000000-0000-0000-0000-d0000000000b', 'b@dc.local', '{"username": "dc_bob"}');
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-d0000000000a', '00000000-0000-0000-0000-d0000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create temp table t (name text primary key, value text);
grant all on t to authenticated, service_role;
discard plans;

-- Qué toca hoy
insert into t select 'puzzle', game from public.get_daily_challenges() where slot = 'puzzle';
insert into t select 'arcade', game from public.get_daily_challenges() where slot = 'arcade';
insert into t select 'duel', game from public.get_daily_challenges() where slot = 'duel';
select is((select count(*)::integer from public.get_daily_challenges()), 3, 'hay puzle, arcade y duelo');
select ok((select value from t where name = 'puzzle') = any (private.daily_pool('puzzle')), 'el puzle es de su lista');
select ok((select value from t where name = 'arcade') = any (private.daily_pool('arcade')), 'el arcade también');
select isnt(private.daily_rotation(private.daily_pool('arcade'), private.game_day()), private.daily_rotation(private.daily_pool('arcade'), private.game_day() + 1),
  'cada día toca otro');

-- Un intento de cada uno el mismo día
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select is((select game from public.start_daily_run((select value from t where name = 'puzzle'))), (select value from t where name = 'puzzle'), 'empieza el puzle');
select is((select game from public.start_daily_run((select value from t where name = 'arcade'))), (select value from t where name = 'arcade'), 'y el arcade el mismo día');
-- Repetir en los primeros segundos devuelve la misma partida (por si se recarga); después, ya no.
select pg_temp.logout();
update public.game_runs set started_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-d0000000000a';
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select throws_ok($$ select public.start_daily_run((select value from t where name = 'arcade')) $$, 'P0001', 'Ya has jugado el reto de hoy',
  'pero cada uno una sola vez');
select throws_ok($$ select public.start_daily_run('chess') $$, 'P0001', 'Ese juego no es reto hoy', 'solo los juegos de hoy');
select is((select count(*)::integer from public.get_my_dailies()), 4, 'los cuatro retos en el resumen');
select is((select status from public.get_my_dailies() where slot = 'puzzle'), 'playing', 'el puzle, en juego');
select is((select status from public.get_my_dailies() where slot = 'duel'), 'available', 'el duelo, por hacer');
select pg_temp.logout();

-- El duelo del día: terminar una partida de ese juego contra un amigo.
insert into public.matches (game, player_x, player_o, created_by, status)
values ((select value from t where name = 'duel'), '00000000-0000-0000-0000-d0000000000a', '00000000-0000-0000-0000-d0000000000b', '00000000-0000-0000-0000-d0000000000a', 'active');
update public.profiles set xp = 0 where id in ('00000000-0000-0000-0000-d0000000000a', '00000000-0000-0000-0000-d0000000000b');
update public.matches set status = 'finished', end_reason = 'points', winner = 'x', updated_at = now()
where player_x = '00000000-0000-0000-0000-d0000000000a' and status = 'active';
select pg_temp.login('00000000-0000-0000-0000-d0000000000b');
select is((select status from public.get_my_dailies() where slot = 'duel'), 'finished', 'el duelo cuenta para los dos');
select pg_temp.logout();
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-d0000000000b'), 10, 'y da 10 de XP (aparte de la de la partida)');

-- Racha y protectores
update public.profiles set streak_days = 6, streak_last_day = private.game_day() - 1, streak_freezes = 0
where id = '00000000-0000-0000-0000-d0000000000a';
select private.touch_streak('00000000-0000-0000-0000-d0000000000a');
select results_eq($$ select streak_days, streak_freezes from public.profiles where id = '00000000-0000-0000-0000-d0000000000a' $$,
  $$ values (7, 1) $$, 'a los 7 días se gana un protector');

update public.profiles set streak_days = 10, streak_last_day = private.game_day() - 3, streak_freezes = 2
where id = '00000000-0000-0000-0000-d0000000000a';
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select results_eq($$ select streak_days, freezes, covering from public.get_my_streak() $$, $$ values (10, 0, 2) $$,
  'con dos días sin jugar y dos protectores, la racha sigue viva');
select pg_temp.logout();
select private.touch_streak('00000000-0000-0000-0000-d0000000000a');
select results_eq($$ select streak_days, streak_freezes from public.profiles where id = '00000000-0000-0000-0000-d0000000000a' $$,
  $$ values (11, 0) $$, 'al volver a jugar se gastan y la racha sigue');
select is((select count(*)::integer from private.streak_log where user_id = '00000000-0000-0000-0000-d0000000000a' and kind = 'frozen'), 2,
  'y esos días quedan como protegidos');

update public.profiles set streak_days = 10, streak_last_day = private.game_day() - 3, streak_freezes = 1
where id = '00000000-0000-0000-0000-d0000000000a';
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select is((select streak_days from public.get_my_streak()), 0, 'si no llegan, la racha se ve cortada');
select pg_temp.logout();
select private.touch_streak('00000000-0000-0000-0000-d0000000000a');
select is((select streak_days from public.profiles where id = '00000000-0000-0000-0000-d0000000000a'), 1, 'y al jugar empieza otra');

select * from finish();
rollback;
