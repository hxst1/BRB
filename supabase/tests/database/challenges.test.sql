begin;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-40000000000a', 'a@ch.local', '{"username": "c_ana"}'),
  ('00000000-0000-0000-0000-40000000000b', 'b@ch.local', '{"username": "c_bob"}'),
  ('00000000-0000-0000-0000-40000000000c', 'c@ch.local', '{"username": "c_carla"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-40000000000a', '00000000-0000-0000-0000-40000000000b', 'accepted', now());

-- Partida terminada de A que servirá de reto, y una en curso que no.
insert into public.game_runs (id, user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-4000000000f1', '00000000-0000-0000-0000-40000000000a', '2048', 123456, 'finished', 5000, now());
insert into public.game_runs (id, user_id, game, seed, status) values
  ('00000000-0000-0000-0000-4000000000f2', '00000000-0000-0000-0000-40000000000a', '2048', 1, 'playing');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated, service_role;
discard plans;

-- --- Crear --------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-40000000000a');
select throws_ok($$ select public.create_challenge('00000000-0000-0000-0000-4000000000f1', '00000000-0000-0000-0000-40000000000c') $$,
  'P0001', null, 'solo se reta a amigos');
select throws_ok($$ select public.create_challenge('00000000-0000-0000-0000-4000000000f2', '00000000-0000-0000-0000-40000000000b') $$,
  'P0002', null, 'solo con partidas terminadas');

insert into ids select 'c1', public.create_challenge('00000000-0000-0000-0000-4000000000f1', '00000000-0000-0000-0000-40000000000b');
select is(public.create_challenge('00000000-0000-0000-0000-4000000000f1', '00000000-0000-0000-0000-40000000000b'),
  (select id from ids where name = 'c1'), 'retar otra vez con la misma partida devuelve el mismo reto');
select is((select target_score from public.challenges where id = (select id from ids where name = 'c1')),
  5000, 'el objetivo es la puntuación de la partida');

select pg_temp.login('00000000-0000-0000-0000-40000000000b');
select throws_ok($$ select public.create_challenge('00000000-0000-0000-0000-4000000000f1', '00000000-0000-0000-0000-40000000000a') $$,
  'P0002', null, 'no se puede retar con la partida de otro');

-- --- El retado ----------------------------------------------------------------

select is((select count(*) from public.game_runs where id = '00000000-0000-0000-0000-4000000000f1')::int,
  0, 'el retado no puede ver la partida del retador (ni su semilla ni sus movimientos)');
select is((select status from public.get_my_challenges() where id = (select id from ids where name = 'c1')),
  'pending', 'el reto está pendiente');
select is((select challenges from public.get_pending_counts()), 1, 'cuenta en los pendientes del retado');

insert into ids select 'run', id from public.start_challenge_run((select id from ids where name = 'c1'));
select is((select seed from public.game_runs where id = (select id from ids where name = 'run')),
  123456::bigint, 'juega con la misma semilla que el retador');
select is((select id from public.start_challenge_run((select id from ids where name = 'c1'))),
  (select id from ids where name = 'run'), 'recargar en los primeros segundos devuelve la misma partida');
select is((select status from public.get_my_challenges() where id = (select id from ids where name = 'c1')),
  'playing', 'el reto pasa a en juego');
select is((select challenges from public.get_pending_counts()), 0, 'ya no cuenta como pendiente');

-- Pasado el margen, no se puede volver a empezar.
select pg_temp.logout();
update public.game_runs set started_at = now() - interval '1 minute' where id = (select id from ids where name = 'run');
select pg_temp.login('00000000-0000-0000-0000-40000000000b');
select throws_ok(format('select * from public.start_challenge_run(%L)', (select id from ids where name = 'c1')),
  'P0001', null, 'solo hay un intento');

-- El servidor valida y cierra la partida: supera el objetivo.
select pg_temp.logout();
set local role service_role;
select public.finish_run((select id from ids where name = 'run'), 'LURD', 6000, 512);
reset role;

select pg_temp.login('00000000-0000-0000-0000-40000000000b');
select is((select status from public.get_my_challenges() where id = (select id from ids where name = 'c1')),
  'won', 'superar el objetivo gana el reto');
select pg_temp.login('00000000-0000-0000-0000-40000000000a');
select is((select attempt_score from public.get_my_challenges() where id = (select id from ids where name = 'c1')),
  6000, 'el retador ve la puntuación del intento');

-- --- Rechazar y abandonar -----------------------------------------------------

select pg_temp.logout();
insert into public.game_runs (id, user_id, game, seed, status, score, finished_at) values
  ('00000000-0000-0000-0000-4000000000f3', '00000000-0000-0000-0000-40000000000a', '2048', 7, 'finished', 100, now()),
  ('00000000-0000-0000-0000-4000000000f4', '00000000-0000-0000-0000-40000000000a', '2048', 8, 'finished', 100, now());

select pg_temp.login('00000000-0000-0000-0000-40000000000a');
insert into ids select 'c2', public.create_challenge('00000000-0000-0000-0000-4000000000f3', '00000000-0000-0000-0000-40000000000b');
insert into ids select 'c3', public.create_challenge('00000000-0000-0000-0000-4000000000f4', '00000000-0000-0000-0000-40000000000b');
select throws_ok(format('select public.decline_challenge(%L)', (select id from ids where name = 'c2')),
  'P0002', null, 'el retador no puede rechazar su propio reto');

select pg_temp.login('00000000-0000-0000-0000-40000000000b');
select public.decline_challenge((select id from ids where name = 'c2'));
select is((select status from public.get_my_challenges() where id = (select id from ids where name = 'c2')),
  'declined', 'el retado puede rechazarlo');

-- Empezar el reto y luego una partida normal lo abandona: cuenta como perdido.
select * from public.start_challenge_run((select id from ids where name = 'c3'));
select * from public.start_run('2048');
select is((select status from public.get_my_challenges() where id = (select id from ids where name = 'c3')),
  'lost', 'abandonar el intento pierde el reto');

select pg_temp.login('00000000-0000-0000-0000-40000000000c');
select is((select count(*) from public.challenges)::int, 0, 'terceros no ven los retos');

select * from finish();
rollback;
