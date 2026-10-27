begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9e000000000a', 'a@gp.local', '{"username": "gp_ana"}');
-- Un invitado: usuario anónimo con el código de Ana.
-- created_at lo pone Supabase Auth al crear la cuenta; aquí, a mano.
insert into auth.users (id, is_anonymous, created_at, raw_user_meta_data)
select '00000000-0000-0000-0000-9e000000000b', true, now(), jsonb_build_object('invited_by', f.code)
from public.friend_codes f where f.user_id = '00000000-0000-0000-0000-9e000000000a';

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated', 'is_anonymous', true)::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create temp table code as select f.code from public.friend_codes f where f.user_id = '00000000-0000-0000-0000-9e000000000a';
grant select on code to anon, authenticated;
discard plans;

set local role anon;
select is((select username from public.get_invite((select code from code))), 'gp_ana', 'sin cuenta se ve quién invita');
select is((select count(*)::integer from public.get_invite('ZZZZZ')), 0, 'y un código que no existe no da nada');
select throws_ok($$ select public.challenge_inviter((select code from code), 'connect4') $$, '42501', null, 'pero sin cuenta no se puede retar');
reset role;

select ok(private.are_friends('00000000-0000-0000-0000-9e000000000a', '00000000-0000-0000-0000-9e000000000b'), 'el invitado ya es amigo de quien le invitó');

select pg_temp.login('00000000-0000-0000-0000-9e000000000b');
select isnt(public.challenge_inviter((select code from code), 'connect4'), null, 'y le reta al momento');
select is(public.challenge_inviter(lower((select code from code)), 'connect4'),
  (select id from public.matches where game = 'connect4' and created_by = '00000000-0000-0000-0000-9e000000000b'),
  'repetirlo devuelve la misma partida');
select results_eq($$ select status, player_x from public.matches where game = 'connect4' and created_by = '00000000-0000-0000-0000-9e000000000b' $$,
  $$ values ('active'::text, '00000000-0000-0000-0000-9e000000000b'::uuid) $$, 'la partida empieza ya y el invitado mueve primero');
select throws_ok($$ select public.challenge_inviter((select code from code), 'pong') $$, '22023', null, 'solo juegos por turnos');
select pg_temp.logout();

-- Limpieza: se borra el invitado sin usar; quien tiene cuenta, no.
select is(private.cleanup_guests(now() + interval '31 days'), 1, 'a los 30 días sin usarse se borra la cuenta de invitado');
select ok(exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-9e000000000a'), 'las cuentas normales no se tocan');

select * from finish();
rollback;
