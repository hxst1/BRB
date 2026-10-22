begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ae000000000a', 'a@ax.local', '{"username": "ax_ana"}');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ae000000000b', 'b@ax.local',
   jsonb_build_object('username', 'ax_bob', 'invited_by', (select code from public.friend_codes where user_id = '00000000-0000-0000-0000-ae000000000a')));
-- En otra orden: el código de bob no existe hasta que bob está creado.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ae000000000c', 'c@ax.local',
   jsonb_build_object('username', 'ax_carla', 'invited_by', (select code from public.friend_codes where user_id = '00000000-0000-0000-0000-ae000000000b')));
insert into public.game_runs (id, user_id, game, seed, status)
values ('00000000-0000-0000-0000-ae00000000f1', '00000000-0000-0000-0000-ae000000000c', '2048', 1, 'playing');
update public.game_runs set status = 'finished', score = 10, max_tile = 8, finished_at = now() where id = '00000000-0000-0000-0000-ae00000000f1';
select public.record_github_contribution('00000000-0000-0000-0000-ae000000000b', 'issue', 'bob', 'https://github.com/x/y/issues/9');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-ae000000000b');
select throws_ok($$ select * from public.admin_get_referrals(auth.uid()) $$, '42501', null, 'un usuario no puede usarlas');
reset role;
select set_config('request.jwt.claims', '', true);

select ok((select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p
  where p.proname in ('admin_get_github_contributions', 'admin_get_referrals')), 'el panel sí');

select results_eq($$ select kind, github_login, url from public.admin_get_github_contributions('00000000-0000-0000-0000-ae000000000b') $$,
  $$ values ('issue'::text, 'bob'::text, 'https://github.com/x/y/issues/9'::text) $$, 'sus colaboraciones en GitHub');

select results_eq($$ select direction, username, has_played from public.admin_get_referrals('00000000-0000-0000-0000-ae000000000b') $$,
  $$ values ('invited_by'::text, 'ax_ana'::text, false), ('invited', 'ax_carla', true) $$,
  'quién le invitó primero y luego a quién invitó, con si ha jugado');
select is((select friend_code from public.admin_get_referrals('00000000-0000-0000-0000-ae000000000b') where direction = 'invited'),
  (select code from public.friend_codes where user_id = '00000000-0000-0000-0000-ae000000000c'), 'con su código de amigo');
select is((select count(*) from public.admin_get_referrals('00000000-0000-0000-0000-ae000000000a') where direction = 'invited_by')::int, 0,
  'sin invitación, no hay fila invited_by');

select * from finish();
rollback;
