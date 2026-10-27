begin;
select plan(13);

-- El XP extra del duelo del día depende de la fecha: aquí no cuenta.
alter table public.matches disable trigger daily_duel_on_match_finished;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-b5000000000a', 'a@bs.local', '{"username": "bs_ana"}'),
  ('00000000-0000-0000-0000-b5000000000b', 'b@bs.local', '{"username": "bs_bob"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-b5000000000a', '00000000-0000-0000-0000-b5000000000b', 'accepted', now());

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

select pg_temp.login('00000000-0000-0000-0000-b5000000000a');
insert into ids select 'm', public.create_match('battleship', '00000000-0000-0000-0000-b5000000000b');
select pg_temp.logout();
select is((select body from public.messages where kind = 'match' and ref_id = (select id from ids)),
  'Reto a hundir la flota', 'el reto aparece en el chat');

select pg_temp.login('00000000-0000-0000-0000-b5000000000b');
select public.respond_match((select id from ids), true);
select pg_temp.logout();
-- A es X para que el test no dependa de quién empieza.
update public.matches set player_x = '00000000-0000-0000-0000-b5000000000a', player_o = '00000000-0000-0000-0000-b5000000000b'
where id = (select id from ids);

-- --- Colocar ------------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-b5000000000a');
select is((select my_turn from public.get_pending_counts()), 1, 'antes de colocar, te toca colocar');
select throws_ok(format('select public.submit_battleship_fleet(%L, auth.uid(), %L)', (select id from ids), '[[0],[1],[2],[3],[4]]'),
  '42501', null, 'el jugador no guarda su flota directamente');
select pg_temp.logout();

set local role service_role;
select public.submit_battleship_fleet((select id from ids), '00000000-0000-0000-0000-b5000000000a',
  '[[0,1,2,3,4],[20,21,22,23],[40,41,42],[60,61,62],[80,81]]');
select throws_ok(format('select public.submit_battleship_fleet(%L, %L, %L)', (select id from ids),
  '00000000-0000-0000-0000-b5000000000a', '[[9,19,29,39,49],[20,21,22,23],[40,41,42],[60,61,62],[80,81]]'),
  'P0001', null, 'la flota solo se coloca una vez');
reset role;

select pg_temp.login('00000000-0000-0000-0000-b5000000000a');
select is((select my_turn from public.get_pending_counts()), 0, 'con tu flota y sin la del rival, no te toca');
select results_eq($$ select me_ready, rival_ready from public.get_battleship_status() $$,
  $$ values (true, false) $$, 'sabes que el rival aún no ha colocado');
select pg_temp.logout();

set local role service_role;
select public.submit_battleship_fleet((select id from ids), '00000000-0000-0000-0000-b5000000000b',
  '[[5,6,7,8,9],[25,26,27,28],[45,46,47],[65,66,67],[85,86]]');
reset role;

-- --- Secreto ------------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-b5000000000a');
select is((select my_turn from public.get_pending_counts()), 1, 'con las dos flotas, X dispara primero');
select is((select count(*) from public.battleship_fleets), 1::bigint, 'durante la partida solo ves tu flota');
select pg_temp.login('00000000-0000-0000-0000-b5000000000b');
select is((select my_turn from public.get_pending_counts()), 0, 'a O todavía no le toca');
select pg_temp.logout();

-- --- Disparos -----------------------------------------------------------------------

set local role service_role;
-- X dispara a la casilla 5: tocado (5 + 100).
select public.apply_match_move((select id from ids), 0, '{105}');
select throws_ok(format('select public.submit_battleship_fleet(%L, %L, %L)', (select id from ids),
  '00000000-0000-0000-0000-b5000000000a', '[[0,1,2,3,4],[20,21,22,23],[40,41,42],[60,61,62],[80,81]]'),
  'P0001', null, 'tras el primer disparo ya no se coloca');
select public.apply_match_move((select id from ids), 1, '{105,99}', 'fleet', 'x');
reset role;

select results_eq($$ select status, end_reason, winner from public.matches where id = (select id from ids) $$,
  $$ values ('finished'::text, 'fleet'::text, 'x'::text) $$, 'se puede ganar hundiendo la flota');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-b5000000000a'), 10, 'ganar da XP');

select pg_temp.login('00000000-0000-0000-0000-b5000000000b');
select is((select count(*) from public.battleship_fleets), 2::bigint, 'al acabar se ven las dos flotas');
select pg_temp.logout();

select * from finish();
rollback;
