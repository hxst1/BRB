begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9e000000000a', 'a@pr.local', '{"username": "pr_ana"}'),
  ('00000000-0000-0000-0000-9e000000000b', 'b@pr.local', '{"username": "pr_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

-- --- Presencia ----------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-9e000000000a');
select lives_ok($$ select public.set_presence('/4-en-raya/123') $$, 'cada uno dice en qué pantalla está');
select public.set_presence('/chat');
select throws_ok($$ select * from public.presence $$, '42501', null, 'pero nadie puede leer dónde están los demás');
select pg_temp.logout();
select is((select path from public.presence where user_id = '00000000-0000-0000-0000-9e000000000a'), '/chat',
  'se guarda la última pantalla');

set local role anon;
select throws_ok($$ select public.set_presence('/') $$, '42501', null, 'sin sesión no hay presencia');
reset role;

-- --- Caducidad -----------------------------------------------------------------------

insert into public.matches (id, game, player_x, player_o, created_by, status, created_at) values
  ('00000000-0000-0000-0000-9e00000000f1', 'tictactoe', '00000000-0000-0000-0000-9e000000000a', '00000000-0000-0000-0000-9e000000000b',
   '00000000-0000-0000-0000-9e000000000a', 'pending', now() - interval '4 days'),
  ('00000000-0000-0000-0000-9e00000000f2', 'connect4', '00000000-0000-0000-0000-9e000000000a', '00000000-0000-0000-0000-9e000000000b',
   '00000000-0000-0000-0000-9e000000000a', 'pending', now() - interval '1 day'),
  ('00000000-0000-0000-0000-9e00000000f3', 'pong', '00000000-0000-0000-0000-9e000000000a', '00000000-0000-0000-0000-9e000000000b',
   '00000000-0000-0000-0000-9e000000000a', 'active', now() - interval '5 days');

select cmp_ok(private.expire_challenges(), '>=', 1, 'caducan los retos viejos');
select results_eq(
  $$ select id::text, status from public.matches where id::text like '00000000-0000-0000-0000-9e00000000f%' order by id $$,
  $$ values ('00000000-0000-0000-0000-9e00000000f1', 'cancelled'::text),
            ('00000000-0000-0000-0000-9e00000000f2', 'pending'),
            ('00000000-0000-0000-0000-9e00000000f3', 'active') $$,
  'solo los pendientes de más de 3 días; las partidas en juego no se tocan');

select pg_temp.login('00000000-0000-0000-0000-9e000000000a');
select throws_ok($$ select private.expire_challenges() $$, '42501', null, 'el cliente no puede caducar retos');
select pg_temp.logout();

select * from finish();
rollback;
