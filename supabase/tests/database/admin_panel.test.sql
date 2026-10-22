begin;
select plan(31);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ad000000000a', 'a@adm.local', '{"username": "adm_ana"}'),
  ('00000000-0000-0000-0000-ad000000000b', 'b@adm.local', '{"username": "adm_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

-- Partidas de bob: un 2048 y un sudoku difícil, terminados ayer.
insert into public.game_runs (id, user_id, game, seed, status) values
  ('00000000-0000-0000-0000-ad00000000f1', '00000000-0000-0000-0000-ad000000000b', '2048', 1, 'playing'),
  ('00000000-0000-0000-0000-ad00000000f2', '00000000-0000-0000-0000-ad000000000b', 'sudoku-hard', 1, 'playing');
update public.game_runs set status = 'finished', score = 5000, max_tile = 512, finished_at = now() - interval '1 day'
where id = '00000000-0000-0000-0000-ad00000000f1';
update public.game_runs set status = 'finished', score = 600000, finished_at = now() - interval '1 day'
where id = '00000000-0000-0000-0000-ad00000000f2';
update public.profiles set xp = 100 where id = '00000000-0000-0000-0000-ad000000000b';

-- --- Permisos ---------------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-ad000000000a');
select throws_ok($$ select public.admin_invalidate_run(auth.uid(), '00000000-0000-0000-0000-ad00000000f1', 'trampas') $$,
  '42501', null, 'un usuario normal no puede usar las funciones de admin');
select throws_ok($$ select * from public.admin_list_users() $$, '42501', null, 'ni listar usuarios');
select throws_ok($$ select public.report_app_error('x', null, null, null, null, null, 'client') $$, '42501', null,
  'ni guardar errores directamente');
set local role anon;
select throws_ok($$ select * from public.admin_attention() $$, '42501', null, 'ni sin sesión');
reset role;
select pg_temp.logout();

-- El panel usa la clave secreta (service_role): tiene que poder usarlas todas.
select ok(bool_and(has_function_privilege('service_role', p.oid, 'execute')),
  'service_role puede usar todas las funciones de admin')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'admin\_%' or p.proname = 'report_app_error');

-- Lo demás, como el servidor del panel (aquí como superusuario, para poder mirar el esquema private).

-- --- Invalidar y restablecer -----------------------------------------------------------

select throws_ok($$ select public.admin_invalidate_run('00000000-0000-0000-0000-ad000000000a', '00000000-0000-0000-0000-ad00000000f1', ' ') $$,
  '22023', null, 'invalidar pide un motivo');
select throws_ok($$ select public.admin_invalidate_run('00000000-0000-0000-0000-ad000000000a', gen_random_uuid(), 'trampas') $$,
  'P0002', null, 'una partida que no existe da P0002');
select is(public.admin_invalidate_run('00000000-0000-0000-0000-ad000000000a', '00000000-0000-0000-0000-ad00000000f1', 'trampas'),
  private.xp_for_run('2048', 5000), 'invalidar devuelve la XP quitada');
select is((select status || '|' || rejection_reason from public.game_runs where id = '00000000-0000-0000-0000-ad00000000f1'),
  'rejected|admin: trampas', 'la partida queda rechazada con el prefijo admin');
select cmp_ok((select finished_at from public.game_runs where id = '00000000-0000-0000-0000-ad00000000f1'), '<', now() - interval '12 hours',
  'y conserva su fecha real');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-ad000000000b'), 100 - private.xp_for_run('2048', 5000),
  'se resta la XP al jugador');
select throws_ok($$ select public.admin_invalidate_run('00000000-0000-0000-0000-ad000000000a', '00000000-0000-0000-0000-ad00000000f1', 'otra vez') $$,
  'P0002', null, 'solo se invalidan partidas terminadas');

select results_eq($$ select * from public.admin_reset_scores('00000000-0000-0000-0000-ad000000000a', '00000000-0000-0000-0000-ad000000000b', 'limpieza', 'sudoku-hard') $$,
  $$ values (1, 25) $$, 'restablecer un juego invalida sus partidas y devuelve la XP');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-ad000000000b'), greatest(0, 100 - private.xp_for_run('2048', 5000) - 25),
  'la XP nunca baja de 0');

select is((select array_agg(action order by id desc) from public.admin_get_audit('00000000-0000-0000-0000-ad000000000b')),
  array['reset_scores', 'invalidate_run'], 'cada acción queda en la auditoría, la última primero');
select is((select admin_username from public.admin_get_audit() limit 1), 'adm_ana', 'con el nombre del admin');

-- --- Mensajes de los jugadores ----------------------------------------------------------

insert into public.feedback (id, user_id, kind, body) values
  ('00000000-0000-0000-0000-ad00000000c1', '00000000-0000-0000-0000-ad000000000b', 'bug', 'No carga el tablero');
select lives_ok($$ select public.admin_update_feedback('00000000-0000-0000-0000-ad000000000a', '00000000-0000-0000-0000-ad00000000c1', 'planned', ' Lo miramos ') $$,
  'responder un mensaje');
select is((select status || '|' || admin_reply from public.feedback where id = '00000000-0000-0000-0000-ad00000000c1'),
  'planned|Lo miramos', 'cambia el estado y guarda la respuesta sin espacios');
select throws_ok($$ select public.admin_update_feedback('00000000-0000-0000-0000-ad000000000a', gen_random_uuid(), 'seen', '') $$,
  'P0002', null, 'un mensaje que no existe da P0002');

-- --- Actividad y resumen ----------------------------------------------------------------

select ok(exists (select 1 from private.daily_activity where user_id = '00000000-0000-0000-0000-ad000000000b'),
  'terminar una partida cuenta como actividad');
select is((select count(*) from public.admin_daily_stats(7))::int, 7, 'una fila por día, también los vacíos');
select ok((select active_users >= 1 from public.admin_daily_stats(7) where day = private.game_day(now() - interval '1 day')),
  'cuenta a quien jugó ese día');

-- --- Usuarios --------------------------------------------------------------------------

select is((select username from public.admin_list_users((select code from public.friend_codes where user_id = '00000000-0000-0000-0000-ad000000000b'))),
  'adm_bob', 'se busca por código de amigo');
select is((select count(*) from public.admin_list_users('adm_'))::int, 2, 'o por parte del nombre');
select ok(pg_get_function_result('public.admin_list_users(text, integer, integer)'::regprocedure) !~ 'email',
  'sin emails');

-- --- Errores ---------------------------------------------------------------------------

select is(
  public.report_app_error('Fallo al cargar 123', E'TypeError\n    at loadBoard (https://x.app/_next/a1.js:10:5)', '/sudoku', null, 'Firefox', 'v1', 'client'),
  public.report_app_error('Fallo al cargar 987', E'TypeError\n    at loadBoard (https://x.app/_next/zz9.js:44:2)', '/2048', '00000000-0000-0000-0000-ad000000000b', 'Chrome', 'v1', 'client'),
  'el mismo error con otros números, archivos o posiciones va al mismo grupo');
select results_eq(
  $$ select count, users, status from public.admin_list_error_groups('open') where message like 'Fallo al cargar%' $$,
  $$ values (2::bigint, 1, 'open'::text) $$, 'el grupo cuenta las veces y los usuarios distintos');

select lives_ok($$ select public.admin_set_error_status('00000000-0000-0000-0000-ad000000000a',
  (select fingerprint from private.error_groups where message like 'Fallo al cargar%'), 'resolved') $$, 'marcar como resuelto');
select public.report_app_error('Fallo al cargar 5', E'    at loadBoard (x.js:1:1)', '/', null, null, 'v1', 'client');
select is((select status from public.admin_get_error_group((select fingerprint from private.error_groups where message like 'Fallo al cargar%'))),
  'resolved', 'si vuelve en la misma versión, sigue resuelto (clientes con la versión vieja)');
select public.report_app_error('Fallo al cargar 6', E'    at loadBoard (x.js:1:1)', '/', null, null, 'v2', 'client');
select is((select status from public.admin_get_error_group((select fingerprint from private.error_groups where message like 'Fallo al cargar%'))),
  'open', 'si vuelve en otra versión, se reabre');

select results_eq($$ select open_errors >= 1, unread_feedback >= 0, rejected_runs_24h from public.admin_attention() $$,
  $$ values (true, true, 0) $$, 'lo que pide atención no cuenta lo invalidado a mano');

select * from finish();
rollback;
