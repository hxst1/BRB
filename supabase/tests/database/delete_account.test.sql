begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-de000000000a', 'a@del.local', '{"username": "del_ana"}'),
  ('00000000-0000-0000-0000-de000000000b', 'b@del.local', '{"username": "del_bob"}');
insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('00000000-0000-0000-0000-de000000000a', '00000000-0000-0000-0000-de000000000b', 'accepted', now());
insert into public.messages (sender_id, recipient_id, body) values
  ('00000000-0000-0000-0000-de000000000a', '00000000-0000-0000-0000-de000000000b', 'hola'),
  ('00000000-0000-0000-0000-de000000000b', '00000000-0000-0000-0000-de000000000a', 'adiós');
insert into public.supporter_events (provider, provider_ref, event, user_id, active, payload)
values ('kofi', 'tx-del', 'Donation', '00000000-0000-0000-0000-de000000000a', true, '{"email": "A@del.local", "from_name": "Ana"}');
insert into private.admin_audit (admin_id, action, target_user, details)
values ('00000000-0000-0000-0000-de000000000b', 'rename_user', '00000000-0000-0000-0000-de000000000a', '{"from": "del_ana"}');
insert into auth.audit_log_entries (id, payload)
values (gen_random_uuid(), '{"action": "login", "actor_id": "00000000-0000-0000-0000-de000000000a", "actor_username": "a@del.local"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-de000000000a');
select throws_ok($$ select public.delete_account(auth.uid()) $$, '42501', null, 'nadie puede borrar cuentas desde la app directamente');
reset role;
select set_config('request.jwt.claims', '', true);

select lives_ok($$ select public.delete_account('00000000-0000-0000-0000-de000000000a') $$, 'el servidor borra la cuenta');
select is((select count(*) from auth.users where id = '00000000-0000-0000-0000-de000000000a')::int, 0, 'ya no existe la cuenta');
select is((select count(*) from public.profiles where id = '00000000-0000-0000-0000-de000000000a')::int, 0, 'ni su perfil');
select is((select count(*) from public.messages where '00000000-0000-0000-0000-de000000000a' in (sender_id, recipient_id))::int, 0,
  'ni sus mensajes, en los dos sentidos');
select is((select count(*) from public.supporter_events where provider_ref = 'tx-del')::int, 0, 'ni sus pagos (con su email)');
select is((select count(*) from private.admin_audit where details ->> 'from' = 'del_ana')::int, 0, 'ni la auditoría sobre ella');
select is((select count(*) from auth.audit_log_entries where payload ->> 'actor_username' = 'a@del.local')::int, 0,
  'ni el registro de accesos');
select is((select count(*) from public.profiles where id = '00000000-0000-0000-0000-de000000000b')::int, 1, 'su amigo sigue ahí');

select * from finish();
rollback;
