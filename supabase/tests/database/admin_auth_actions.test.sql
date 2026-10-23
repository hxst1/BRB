begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-aa000000000a', 'a@aa.local', '{"username": "aa_ana"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-aa000000000a');
select throws_ok($$ select public.admin_log_auth_action(auth.uid(), 'set_password', auth.uid(), 'quiero') $$, '42501', null, 'un usuario no puede usarla');
reset role;
select set_config('request.jwt.claims', '', true);

set local role service_role;
select lives_ok($$ select public.admin_log_auth_action(gen_random_uuid(), 'password_reset_link', '00000000-0000-0000-0000-aa000000000a', 'me lo pidió por email') $$,
  'el panel apunta un enlace generado');
select throws_ok($$ select public.admin_log_auth_action(gen_random_uuid(), 'delete_everything', '00000000-0000-0000-0000-aa000000000a', 'motivo') $$,
  '22023', null, 'solo las acciones previstas');
select throws_ok($$ select public.admin_log_auth_action(gen_random_uuid(), 'set_password', gen_random_uuid(), 'motivo') $$,
  'P0002', null, 'solo usuarios que existen');
select throws_ok($$ select public.admin_log_auth_action(gen_random_uuid(), 'set_password', '00000000-0000-0000-0000-aa000000000a', '') $$,
  null, null, 'con motivo');
reset role;

select is((select count(*) from private.admin_audit where target_user = '00000000-0000-0000-0000-aa000000000a' and action = 'password_reset_link')::int, 1,
  'queda en la auditoría');

select * from finish();
rollback;
