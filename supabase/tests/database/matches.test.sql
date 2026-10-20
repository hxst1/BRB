begin;
select plan(24);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-20000000000a', 'a@matches.local', '{"username": "m_ana"}'),
  ('00000000-0000-0000-0000-20000000000b', 'b@matches.local', '{"username": "m_bob"}'),
  ('00000000-0000-0000-0000-20000000000c', 'c@matches.local', '{"username": "m_carla"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-20000000000a', '00000000-0000-0000-0000-20000000000b', 'accepted', now());

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

-- --- Retar ---------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-20000000000a');
select throws_ok($$ select public.create_match('tictactoe', '00000000-0000-0000-0000-20000000000c') $$,
  'P0001', null, 'solo se puede retar a amigos');

insert into ids select 'm1', public.create_match('tictactoe', '00000000-0000-0000-0000-20000000000b');
select is((select status from public.matches where id = (select id from ids where name = 'm1')),
  'pending', 'el reto queda pendiente');
select is(public.create_match('tictactoe', '00000000-0000-0000-0000-20000000000b'), (select id from ids where name = 'm1'),
  'retar otra vez devuelve la partida abierta');
select throws_ok($$ insert into public.matches (game, player_x, player_o, created_by)
  values ('tictactoe', auth.uid(), '00000000-0000-0000-0000-20000000000b', auth.uid()) $$,
  '42501', null, 'no se pueden crear partidas directamente');
select throws_ok(format('select public.respond_match(%L, true)', (select id from ids where name = 'm1')),
  'P0002', null, 'quien reta no puede aceptar su propio reto');

select pg_temp.login('00000000-0000-0000-0000-20000000000c');
select is((select count(*) from public.matches)::int, 0, 'terceros no ven la partida');
select throws_ok(format('select public.respond_match(%L, true)', (select id from ids where name = 'm1')),
  'P0002', null, 'terceros no pueden aceptar');

select pg_temp.login('00000000-0000-0000-0000-20000000000b');
select lives_ok(format('select public.respond_match(%L, true)', (select id from ids where name = 'm1')),
  'el retado acepta');
select is((select status from public.matches where id = (select id from ids where name = 'm1')),
  'active', 'la partida empieza');

-- --- Jugadas (solo el servidor) ------------------------------------------------

select throws_ok(format('select public.apply_match_move(%L, 0, ''{4}'')', (select id from ids where name = 'm1')),
  '42501', null, 'el cliente no puede guardar jugadas');
select throws_ok(format('update public.matches set moves = ''{0,1,2}'' where id = %L', (select id from ids where name = 'm1')),
  '42501', null, 'ni modificar la partida directamente');

select pg_temp.logout();
set local role service_role;
select lives_ok(format('select public.apply_match_move(%L, 0, ''{4}'')', (select id from ids where name = 'm1')),
  'el servidor guarda una jugada');
select throws_ok(format('select public.apply_match_move(%L, 0, ''{0}'')', (select id from ids where name = 'm1')),
  'P0002', null, 'una jugada validada sobre un estado viejo se descarta');
select lives_ok(format('select public.apply_match_move(%L, 1, ''{4,0,2,1,6}'', ''line'', ''x'')', (select id from ids where name = 'm1')),
  'el servidor cierra la partida con ganador');
reset role;

select is((select status from public.matches where id = (select id from ids where name = 'm1')),
  'finished', 'la partida termina');
select is(
  (select xp from public.profiles p join public.matches m on p.id = m.player_x where m.id = (select id from ids where name = 'm1')),
  10, 'el ganador suma 10 XP');
select is(
  (select xp from public.profiles p join public.matches m on p.id = m.player_o where m.id = (select id from ids where name = 'm1')),
  2, 'el perdedor suma 2 XP por jugar');

-- --- Revancha, cancelar y rendirse ---------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-20000000000b');
insert into ids select 'm2', public.create_match('tictactoe', '00000000-0000-0000-0000-20000000000a');
select isnt((select id from ids where name = 'm2'), (select id from ids where name = 'm1'),
  'con la anterior terminada se puede crear otra');
select lives_ok(format('select public.cancel_match(%L)', (select id from ids where name = 'm2')),
  'quien reta puede retirarlo');

insert into ids select 'm3', public.create_match('tictactoe', '00000000-0000-0000-0000-20000000000a');
select pg_temp.login('00000000-0000-0000-0000-20000000000a');
select public.respond_match((select id from ids where name = 'm3'), true);
create temp table xp_before as select xp from public.profiles where id = '00000000-0000-0000-0000-20000000000b';
select lives_ok(format('select public.resign_match(%L)', (select id from ids where name = 'm3')),
  'un jugador se rinde');
select is(
  (select case when player_x = '00000000-0000-0000-0000-20000000000a' then 'o' else 'x' end = winner
   from public.matches where id = (select id from ids where name = 'm3')),
  true, 'gana el otro');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-20000000000b'),
  (select xp from xp_before), 'rendirse no regala XP');

-- Jugar en una partida terminada.
set local role service_role;
select throws_ok(format('select public.apply_match_move(%L, 5, ''{4,0,2,1,6,3}'')', (select id from ids where name = 'm1')),
  'P0002', null, 'una partida terminada no admite más jugadas');
reset role;

-- Tope diario de XP por pareja: ya llevan 1 partida terminada (m1); de 5 empates
-- más solo dan XP los 4 primeros.
create temp table xp_before_draws as select xp from public.profiles where id = '00000000-0000-0000-0000-20000000000b';
do $$
declare
  match_id uuid;
begin
  for i in 1..5 loop
    insert into public.matches (game, player_x, player_o, created_by, status)
    values ('tictactoe', '00000000-0000-0000-0000-20000000000a', '00000000-0000-0000-0000-20000000000b',
            '00000000-0000-0000-0000-20000000000a', 'active')
    returning id into match_id;
    perform public.apply_match_move(match_id, 0, '{0,1,2,4,3,5,7,6,8}', 'draw', null);
  end loop;
end;
$$;
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-20000000000b') - (select xp from xp_before_draws),
  16, 'tras 5 partidas al día con la misma pareja ya no se gana XP');

select * from finish();
rollback;
