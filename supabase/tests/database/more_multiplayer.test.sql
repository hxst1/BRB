begin;
select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-7e000000000a', 'a@mm.local', '{"username": "mm_ana"}'),
  ('00000000-0000-0000-0000-7e000000000b', 'b@mm.local', '{"username": "mm_bob"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-7e000000000a', '00000000-0000-0000-0000-7e000000000b', 'accepted', now());

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

-- Retos a los tres juegos. A es X en todos para que el test no dependa del sorteo.
select pg_temp.login('00000000-0000-0000-0000-7e000000000a');
insert into ids select g, public.create_match(g, '00000000-0000-0000-0000-7e000000000b') from unnest(array['reversi', 'dots', 'typing']) g;
select pg_temp.logout();
update public.matches set player_x = '00000000-0000-0000-0000-7e000000000a', player_o = '00000000-0000-0000-0000-7e000000000b'
where id in (select id from ids);

select is((select count(*)::integer from public.messages where kind = 'match' and ref_id in (select id from ids)), 3,
  'los tres retos aparecen en el chat');
select is((select body from public.messages where kind = 'match' and ref_id = (select id from ids where name = 'dots')),
  'Reto a puntos y cajas', 'con el nombre de su juego');

select pg_temp.login('00000000-0000-0000-0000-7e000000000b');
select public.respond_match(id, true) from ids;
select pg_temp.logout();

-- Te toca: Reversi y puntos y cajas a X con 0 movimientos; la carrera, a los dos.
select pg_temp.login('00000000-0000-0000-0000-7e000000000a');
select is((select my_turn from public.get_pending_counts()), 3, 'a X le tocan las tres partidas');
select pg_temp.login('00000000-0000-0000-0000-7e000000000b');
select is((select my_turn from public.get_pending_counts()), 1, 'a O solo la carrera');
select pg_temp.logout();

-- Puntos y cajas: X cierra una caja y el juego pone un -1 en el turno de O.
set local role service_role;
select public.apply_match_move((select id from ids where name = 'dots'), 0, '{0,1,2,-1}');
reset role;
select pg_temp.login('00000000-0000-0000-0000-7e000000000a');
select is((select my_turn from public.get_pending_counts()), 3, 'tras un turno perdido de O vuelve a tocarle a X');
select pg_temp.logout();

-- Reversi: termina por fichas y da XP.
set local role service_role;
select public.apply_match_move((select id from ids where name = 'reversi'), 0, '{19,18,17}', 'points', 'o');
reset role;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-7e000000000b'), 10, 'ganar al Reversi da XP');

-- Carrera de tecleo: solo el servidor la arranca y la acaba.
select pg_temp.login('00000000-0000-0000-0000-7e000000000a');
select throws_ok($$ select public.start_typing_race((select id from ids where name = 'typing'), auth.uid(), 'es', 0) $$,
  '42501', null, 'un jugador no puede fijar la salida');
select throws_ok($$ select public.finish_typing_race((select id from ids where name = 'typing'), auth.uid(), 0) $$,
  '42501', null, 'ni darse la victoria');
select ok(private.can_join_typing('typing:' || (select id from ids where name = 'typing')), 'los jugadores entran en su canal');
select pg_temp.logout();

set local role service_role;
select throws_ok($$ select public.finish_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000a', 0) $$,
  'P0001', 'La carrera no ha empezado', 'no se puede acabar antes de empezar');

-- Sin los dos no hay salida.
select is((select count(*)::integer from public.start_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000a', 'es', 0)),
  0, 'con un solo jugador dentro no empieza');
select throws_ok($$ select public.finish_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000a', 0) $$,
  'P0001', 'La carrera no ha empezado', 'ni se puede acabar');
select is((select count(*)::integer from public.start_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000b', 'es', 0)),
  1, 'al entrar el otro, empieza');
reset role;
update public.typing_races set starts_at = now() - interval '20 seconds' where match_id = (select id from ids where name = 'typing');

set local role service_role;
select is((select starts_at from public.start_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000a', 'en', 3000)),
  now() - interval '20 seconds', 'pedir la salida otra vez devuelve la misma');
select throws_ok($$ select public.finish_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000b', 60000) $$,
  'P0001', 'Demasiado rápido', 'un tiempo imposible no vale');
select public.finish_typing_race((select id from ids where name = 'typing'), '00000000-0000-0000-0000-7e000000000b', 1000);
reset role;

select results_eq($$ select status, winner, end_reason, moves from public.matches where id = (select id from ids where name = 'typing') $$,
  $$ values ('finished'::text, 'o'::text, 'points'::text, '{200}'::smallint[]) $$, 'gana el primero en acabar, con su tiempo en décimas');

select pg_temp.login('00000000-0000-0000-0000-7e000000000c');
select ok(not private.can_join_typing('typing:' || (select id from ids where name = 'typing')), 'nadie más entra en el canal');
select pg_temp.logout();

select * from finish();
rollback;
