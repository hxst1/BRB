begin;
select plan(23);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-d0000000000a', 'a@daily.local', '{"username": "d_ana"}'),
  ('00000000-0000-0000-0000-d0000000000b', 'b@daily.local', '{"username": "d_bob"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-d0000000000a', '00000000-0000-0000-0000-d0000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

create temp table runs (name text primary key, id uuid, seed bigint);
grant all on runs to authenticated, service_role;
discard plans;

-- --- Reto diario ----------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select is((select status from public.get_my_daily()), 'available', 'al empezar el día el reto está disponible');
insert into runs select 'a', id, seed from public.start_daily_run();
select is((select id from public.start_daily_run()), (select id from runs where name = 'a'),
  'repetir la llamada enseguida devuelve la misma partida');
select is((select status from public.get_my_daily()), 'playing', 'el reto queda en curso');

select pg_temp.login('00000000-0000-0000-0000-d0000000000b');
insert into runs select 'b', id, seed from public.start_daily_run();
select is((select seed from runs where name = 'b'), (select seed from runs where name = 'a'),
  'todos juegan la misma partida');
select pg_temp.logout();

select is((select daily from public.game_runs where id = (select id from runs where name = 'a')),
  (now() at time zone 'Europe/Madrid')::date, 'la partida queda marcada con el día');

-- Terminar ambas (como el servidor tras validar).
set local role service_role;
select public.finish_run((select id from runs where name = 'a'), 'L', 3000, 256);
select public.finish_run((select id from runs where name = 'b'), 'L', 5000, 512);
reset role;

-- Pasados los 10 segundos ya no se puede volver a empezar.
update public.game_runs set started_at = now() - interval '1 minute' where daily is not null;

select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select throws_ok($$ select * from public.start_daily_run() $$, 'P0001', null, 'un solo intento al día');
select results_eq($$ select status, score, rank, players from public.get_my_daily() $$,
  $$ values ('finished'::text, 3000, 2::bigint, 2::bigint) $$, 'el panel muestra puntuación y puesto');
select results_eq($$ select username, score from public.get_daily_leaderboard() $$,
  $$ values ('d_bob'::text, 5000), ('d_ana'::text, 3000) $$, 'ranking del día ordenado por puntos');
select is((select count(*) from public.get_daily_leaderboard('friends')), 2::bigint,
  'en amigos solo salen uno mismo y sus amigos');

-- La partida del día no sirve para retar: daría la semilla a quien no ha jugado.
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select throws_ok(format('select public.create_challenge(%L, %L)', (select id from runs where name = 'a'), '00000000-0000-0000-0000-d0000000000b'),
  'P0001', null, 'no se puede retar con la partida del reto diario');

-- Las partidas normales no entran en el ranking del día.
select pg_temp.logout();
insert into public.game_runs (user_id, game, seed, status, score, finished_at)
values ('00000000-0000-0000-0000-d0000000000a', '2048', 1, 'finished', 99999, now());
select is((select max(score) from public.get_daily_leaderboard()), 5000, 'las partidas normales no cuentan en el reto');

-- Sin sesión: ranking sí, jugar no.
set local role anon;
select lives_ok($$ select * from public.get_daily_leaderboard() $$, 'el ranking del día es público');
select throws_ok($$ select * from public.start_daily_run() $$, '42501', null, 'sin sesión no se juega el reto');
reset role;

-- --- Rachas -----------------------------------------------------------------------

select results_eq(
  $$ select streak_days, streak_best, streak_last_day from public.profiles where id = '00000000-0000-0000-0000-d0000000000a' $$,
  $$ values (1, 1, (now() at time zone 'Europe/Madrid')::date) $$, 'terminar una partida empieza la racha');

-- Jugó ayer: hoy suma.
update public.profiles set streak_days = 4, streak_best = 4, streak_last_day = (now() at time zone 'Europe/Madrid')::date - 1
where id = '00000000-0000-0000-0000-d0000000000a';
select private.touch_streak('00000000-0000-0000-0000-d0000000000a');
select results_eq($$ select streak_days, streak_best from public.profiles where id = '00000000-0000-0000-0000-d0000000000a' $$,
  $$ values (5, 5) $$, 'jugar el día siguiente alarga la racha');
select private.touch_streak('00000000-0000-0000-0000-d0000000000a');
select is((select streak_days from public.profiles where id = '00000000-0000-0000-0000-d0000000000a'), 5,
  'jugar más veces el mismo día no suma');

-- Se saltó días: vuelve a empezar, pero conserva la mejor.
update public.profiles set streak_days = 7, streak_best = 9, streak_last_day = (now() at time zone 'Europe/Madrid')::date - 3
where id = '00000000-0000-0000-0000-d0000000000a';
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select results_eq($$ select streak_days, streak_best, played_today from public.get_my_daily() $$,
  $$ values (0, 9, false) $$, 'una racha cortada se muestra a 0');
select pg_temp.logout();
select private.touch_streak('00000000-0000-0000-0000-d0000000000a');
select results_eq($$ select streak_days, streak_best from public.profiles where id = '00000000-0000-0000-0000-d0000000000a' $$,
  $$ values (1, 9) $$, 'tras cortarse empieza de nuevo y guarda la mejor');

-- Terminar una partida contra un amigo cuenta para los dos.
update public.profiles set streak_last_day = null, streak_days = 0 where id in
  ('00000000-0000-0000-0000-d0000000000a', '00000000-0000-0000-0000-d0000000000b');
insert into public.matches (id, game, player_x, player_o, created_by, status)
values ('00000000-0000-0000-0000-d000000000e1', 'tictactoe', '00000000-0000-0000-0000-d0000000000a',
        '00000000-0000-0000-0000-d0000000000b', '00000000-0000-0000-0000-d0000000000a', 'active');
update public.matches set status = 'finished', end_reason = 'resign', winner = 'x'
where id = '00000000-0000-0000-0000-d000000000e1';
select is((select count(*) from public.profiles where streak_days = 1 and id in
  ('00000000-0000-0000-0000-d0000000000a', '00000000-0000-0000-0000-d0000000000b')), 2::bigint,
  'una partida contra un amigo cuenta para los dos');

-- Nadie puede ponerse la racha a mano.
select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select throws_ok($$ update public.profiles set streak_days = 100 where id = auth.uid() $$, '42501', null,
  'la racha no se edita desde el cliente');
select pg_temp.logout();

-- --- Aviso de racha ----------------------------------------------------------------

update public.profiles set streak_days = 3, streak_last_day = (now() at time zone 'Europe/Madrid')::date - 1
where id = '00000000-0000-0000-0000-d0000000000a';
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-d0000000000a', 'https://push.example/a', 'k', 'a');

select is(private.send_streak_reminders((date_trunc('day', now() at time zone 'Europe/Madrid') + interval '20 hours 5 minutes')
  at time zone 'Europe/Madrid'), 1, 'a las 20:00 avisa a quien va a perder la racha');
select is(private.send_streak_reminders((date_trunc('day', now() at time zone 'Europe/Madrid') + interval '12 hours')
  at time zone 'Europe/Madrid'), 0, 'a otras horas no avisa');

select pg_temp.login('00000000-0000-0000-0000-d0000000000a');
select throws_ok($$ select private.send_streak_reminders() $$, '42501', null, 'los avisos no se lanzan desde el cliente');
select pg_temp.logout();

select * from finish();
rollback;
