begin;
select plan(40);

-- Usuarios de prueba (el trigger crea perfil y código de amigo).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-10000000000a', 'ana@pgtap.local', '{"username": "tester"}'),
  ('00000000-0000-0000-0000-10000000000b', 'bob@pgtap.local', '{"username": "TESTER"}'),
  ('00000000-0000-0000-0000-10000000000c', 'carla@pgtap.local', '{}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

create function pg_temp.code_of(id uuid) returns text language sql as $$
  select code from public.friend_codes where user_id = id;
$$;

-- --- Registro -----------------------------------------------------------------

select is((select username from public.profiles where id = '00000000-0000-0000-0000-10000000000a'),
  'tester', 'usa el nombre pedido al registrarse');
select matches((select username from public.profiles where id = '00000000-0000-0000-0000-10000000000b'),
  '^player_[2-9a-hjkmnp-z]{5}$', 'si el nombre está cogido (sin distinguir mayúsculas) genera uno');
select matches((select username from public.profiles where id = '00000000-0000-0000-0000-10000000000c'),
  '^player_', 'sin nombre pedido genera uno');
select is((select count(*) from public.friend_codes where user_id::text like '00000000-0000-0000-0000-1%')::int, 3,
  'cada usuario recibe un código de amigo');
select matches(pg_temp.code_of('00000000-0000-0000-0000-10000000000a'),
  '^[2-9A-HJKMNP-Z]{5}$', 'el código usa el alfabeto sin ambiguos');

-- --- Perfiles -----------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-10000000000a');

select is((select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-1%')::int, 3,
  'los perfiles son públicos');
select is((select count(*) from public.friend_codes)::int, 1, 'solo se ve el propio código de amigo');

update public.profiles set username = 'tester_2' where id = '00000000-0000-0000-0000-10000000000a';
select is((select username from public.profiles where id = '00000000-0000-0000-0000-10000000000a'),
  'tester_2', 'puede cambiar su nombre');

update public.profiles set username = 'hacked' where id = '00000000-0000-0000-0000-10000000000b';
select isnt((select username from public.profiles where id = '00000000-0000-0000-0000-10000000000b'),
  'hacked', 'no puede cambiar el perfil de otro');

select throws_ok($$ update public.profiles set xp = 999999 where id = auth.uid() $$,
  '42501', null, 'no puede darse XP');
select throws_ok($$ update public.profiles set username = 'no vale!' where id = auth.uid() $$,
  '23514', null, 'el nombre debe cumplir el formato');
select throws_ok($$ insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), '00000000-0000-0000-0000-10000000000b') $$,
  '42501', null, 'no puede crear amistades directamente');

-- --- Amistades ----------------------------------------------------------------

select pg_temp.logout();
create temp table codes as select user_id, code from public.friend_codes;
grant select on codes to authenticated;
select pg_temp.login('00000000-0000-0000-0000-10000000000a');

select is(public.send_friend_request(lower((select code from codes where user_id = '00000000-0000-0000-0000-10000000000b')) || ' '),
  'sent', 'envía solicitud (acepta minúsculas y espacios)');
select is(public.send_friend_request((select code from codes where user_id = '00000000-0000-0000-0000-10000000000b')),
  'already_sent', 'no duplica solicitudes');
select is(public.send_friend_request((select code from codes where user_id = '00000000-0000-0000-0000-10000000000a')),
  'self', 'no puede añadirse a sí mismo');
select is(public.send_friend_request('ZZZZZ'), 'not_found', 'código inexistente');

select pg_temp.login('00000000-0000-0000-0000-10000000000c');
select is((select count(*) from public.friendships)::int, 0, 'terceros no ven solicitudes ajenas');

select pg_temp.login('00000000-0000-0000-0000-10000000000b');
select throws_ok(
  format('select public.respond_friend_request(%L, true)', gen_random_uuid()),
  'P0002', null, 'no puede responder solicitudes inexistentes');
select lives_ok(
  $$ select public.respond_friend_request((select id from public.friendships), true) $$,
  'el destinatario acepta la solicitud');
select is((select status::text from public.friendships), 'accepted', 'la amistad queda aceptada');

-- Solicitud cruzada: si C añade a A y A añade a C, se acepta sola.
select pg_temp.login('00000000-0000-0000-0000-10000000000c');
select is(public.send_friend_request((select code from codes where user_id = '00000000-0000-0000-0000-10000000000a')),
  'sent', 'C envía solicitud a A');
select pg_temp.login('00000000-0000-0000-0000-10000000000a');
select is(public.send_friend_request((select code from codes where user_id = '00000000-0000-0000-0000-10000000000c')),
  'accepted', 'A añade a C y se acepta la solicitud pendiente');

-- Límite de intentos: A lleva 5 en esta hora, con 15 más llega a 20.
select is((select count(*) from generate_series(1, 15) where public.send_friend_request('ZZZZZ') = 'not_found')::int,
  15, 'permite hasta 20 intentos por hora');
select is(public.send_friend_request('ZZZZZ'), 'rate_limited', 'a partir de 20 intentos se bloquea');

-- --- Partidas -----------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-10000000000a');
create temp table runs as select * from public.start_run('2048');
grant select on runs to service_role;
select is((select count(*) from public.game_runs where status = 'playing')::int, 1, 'start_run crea la partida');
select throws_ok(format('select public.finish_run(%L, %L, 999999, 2048)', (select id from runs), 'LLLL'),
  '42501', null, 'el cliente no puede cerrar su partida con la puntuación que quiera');
select throws_ok($$ select public.start_run('tetris') $$, '23514', null, 'solo juegos conocidos');

select pg_temp.logout();
set local role service_role;
select lives_ok(format('select public.finish_run(%L, %L, 1200, 128)', (select id from runs), 'LURD'),
  'el servidor cierra la partida validada');
select throws_ok(format('select public.finish_run(%L, %L, 5000, 512)', (select id from runs), 'LURD'),
  'P0002', null, 'no se puede cerrar dos veces');
reset role;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-10000000000a'),
  7, 'suma XP al terminar (1 + 1200 / 200)');

-- Pesca de semillas: una partida en curso por juego y límite por hora.
select pg_temp.login('00000000-0000-0000-0000-10000000000a');
create temp table r1 as select * from public.start_run('2048');
create temp table r2 as select * from public.start_run('2048');
select is((select status from public.game_runs where id = (select id from r1)),
  'abandoned', 'empezar otra partida abandona la que estaba en curso');
select is((select count(*) from public.game_runs where status = 'playing')::int,
  1, 'solo hay una partida en curso');
-- Lleva 3 partidas esta hora: 57 más llegan al límite de 60.
select lives_ok($$ do $do$ begin for i in 1..57 loop perform public.start_run('2048'); end loop; end $do$ $$,
  'permite hasta 60 partidas por hora');
select throws_ok($$ select public.start_run('2048') $$, 'P0001', null,
  'a partir de 60 partidas por hora se bloquea');

select throws_ok($$ update public.profiles set avatar_parts = jsonb_build_object('x', repeat('a', 5000))
  where id = auth.uid() $$, '23514', null, 'avatar_parts tiene tamaño limitado');
select pg_temp.logout();

-- Partes de avatar de supporter.
-- Sin planes en caché, como en una petición real: el trigger ya se ejecutó antes
-- como postgres y eso ocultaba un error de permisos sobre el esquema private.
discard plans;
select pg_temp.login('00000000-0000-0000-0000-10000000000a');
select throws_ok($$ update public.profiles set avatar_parts = '{"top": "crown"}' where id = auth.uid() $$,
  'P0001', null, 'sin ser supporter no puede ponerse la corona');
select lives_ok($$ update public.profiles set avatar_parts = '{"top": "horns", "palette": "mint"}' where id = auth.uid() $$,
  'puede elegir partes normales');
select pg_temp.logout();
update public.profiles set supporter_tier = 'supporter' where id = '00000000-0000-0000-0000-10000000000a';
select pg_temp.login('00000000-0000-0000-0000-10000000000a');
select lives_ok($$ update public.profiles set avatar_parts = '{"top": "crown", "palette": "gold"}' where id = auth.uid() $$,
  'un supporter sí puede');
select pg_temp.logout();

-- Solicitud rechazada y vuelta a enviar.
select pg_temp.login('00000000-0000-0000-0000-10000000000c');
select is(public.send_friend_request((select code from codes where user_id = '00000000-0000-0000-0000-10000000000b')),
  'sent', 'tras una amistad cancelada se puede volver a enviar');

-- --- Rankings -----------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-10000000000b');
select is((select score from public.get_leaderboard('2048', 'friends') where user_id = '00000000-0000-0000-0000-10000000000a'),
  1200, 'los amigos aparecen en el ranking de amigos');

select * from finish();
rollback;
