begin;
select plan(7);

-- El XP extra del duelo del día depende de la fecha: aquí no cuenta.
alter table public.matches disable trigger daily_duel_on_match_finished;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ce000000000a', 'a@ch.local', '{"username": "ch_ana"}'),
  ('00000000-0000-0000-0000-ce000000000b', 'b@ch.local', '{"username": "ch_bob"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-ce000000000a', '00000000-0000-0000-0000-ce000000000b', 'accepted', now());

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

select pg_temp.login('00000000-0000-0000-0000-ce000000000a');
insert into ids select 'm', public.create_match('chess', '00000000-0000-0000-0000-ce000000000b');
select is((select game from public.matches where id = (select id from ids)), 'chess', 'se puede retar al ajedrez');
select pg_temp.logout();

select is((select body from public.messages where kind = 'match' and ref_id = (select id from ids)),
  'Reto al ajedrez', 'el reto aparece en el chat');

-- B acepta. Para que el test no dependa de quién empieza, se fija que A sea X.
select pg_temp.login('00000000-0000-0000-0000-ce000000000b');
select public.respond_match((select id from ids), true);
select pg_temp.logout();
update public.matches set player_x = '00000000-0000-0000-0000-ce000000000a', player_o = '00000000-0000-0000-0000-ce000000000b'
where id = (select id from ids);

select pg_temp.login('00000000-0000-0000-0000-ce000000000a');
select is((select my_turn from public.get_pending_counts()), 1, 'a X le toca con 0 movimientos');
select pg_temp.login('00000000-0000-0000-0000-ce000000000b');
select is((select my_turn from public.get_pending_counts()), 0, 'a O todavía no');
select pg_temp.logout();

-- Jugadas validadas por el servidor (aquí cualquier número: la base de datos no conoce las reglas).
set local role service_role;
select public.apply_match_move((select id from ids), 0, '{0,1,0,1,0,1}');
reset role;
select pg_temp.login('00000000-0000-0000-0000-ce000000000a');
select is((select my_turn from public.get_pending_counts()), 1, 'después de 6 jugadas vuelve a tocarle a X');
select pg_temp.logout();

set local role service_role;
select public.apply_match_move((select id from ids), 6, '{0,1,0,1,0,1,0}', 'checkmate', 'x');
reset role;
select results_eq($$ select status, winner from public.matches where id = (select id from ids) $$,
  $$ values ('finished'::text, 'x'::text) $$, 'la partida termina en jaque mate de X');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-ce000000000a'), 10, 'ganar da XP como en las demás partidas');

select * from finish();
rollback;
