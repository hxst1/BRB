begin;
select plan(13);

-- El XP extra del duelo del día depende de la fecha: aquí no cuenta.
alter table public.matches disable trigger daily_duel_on_match_finished;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-60000000000a', 'a@rps.local', '{"username": "r_ana"}'),
  ('00000000-0000-0000-0000-60000000000b', 'b@rps.local', '{"username": "r_bob"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-60000000000a', '00000000-0000-0000-0000-60000000000b', 'accepted', now());

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

select pg_temp.login('00000000-0000-0000-0000-60000000000a');
insert into ids select 'm', public.create_match('rpsls', '00000000-0000-0000-0000-60000000000b');
select is((select body from public.messages where ref_id = (select id from ids where name = 'm')),
  'Reto a piedra, papel, tijera, lagarto o Spock', 'la tarjeta del chat nombra la variante');

select pg_temp.login('00000000-0000-0000-0000-60000000000b');
select public.respond_match((select id from ids where name = 'm'), true);
select is((select my_turn from public.get_pending_counts()), 1, 'a los dos les toca elegir (B)');
select pg_temp.login('00000000-0000-0000-0000-60000000000a');
select is((select my_turn from public.get_pending_counts()), 1, 'a los dos les toca elegir (A)');

select throws_ok(format('select public.submit_match_choice(%L, auth.uid(), 0::smallint)', (select id from ids where name = 'm')),
  '42501', null, 'el cliente no puede registrar elecciones directamente');

-- El servidor registra la elección de A: aún no hay rival.
select pg_temp.logout();
set local role service_role;
select is(public.submit_match_choice((select id from ids where name = 'm'), '00000000-0000-0000-0000-60000000000a', 4::smallint),
  null::smallint, 'si el rival no ha elegido, hay que esperar');
select throws_ok(format('select public.submit_match_choice(%L, %L, 1::smallint)', (select id from ids where name = 'm'), '00000000-0000-0000-0000-60000000000a'),
  'P0001', null, 'no se puede cambiar de elección en la misma ronda');
reset role;

select pg_temp.login('00000000-0000-0000-0000-60000000000a');
select is((select my_turn from public.get_pending_counts()), 0, 'tras elegir ya no le toca');
select is((select count(*) from public.match_choices)::int, 1, 've su propia elección');

select pg_temp.login('00000000-0000-0000-0000-60000000000b');
select is((select count(*) from public.match_choices)::int, 0, 'el rival no puede ver la elección de A');

-- B elige: el servidor recibe la de A para resolver la ronda.
select pg_temp.logout();
set local role service_role;
select is(public.submit_match_choice((select id from ids where name = 'm'), '00000000-0000-0000-0000-60000000000b', 0::smallint),
  4::smallint, 'con las dos elecciones, el servidor recibe la del rival');
select lives_ok(format('select public.apply_match_move(%L, 0, %L)', (select id from ids where name = 'm'), '{4,0}'),
  'el servidor publica la ronda resuelta');
select lives_ok(format('select public.apply_match_move(%L, 2, %L, %L, %L)', (select id from ids where name = 'm'), '{4,0,4,0}', 'rounds', 'x'),
  'y cierra la partida ganada por rondas');
reset role;

select is((select xp from public.profiles p join public.matches m on p.id = m.player_x where m.id = (select id from ids where name = 'm')),
  10, 'ganar por rondas da XP');

select * from finish();
rollback;
