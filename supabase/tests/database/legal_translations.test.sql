begin;
select plan(5);

select is((select count(*) from public.legal_translations where lang = 'en')::int, 3, 'los tres textos están en inglés');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

set local role anon;
select is((select title from public.legal_translations where slug = 'cookies' and lang = 'en'), 'Cookie policy', 'cualquiera puede leerlas');
select throws_ok($$ update public.legal_translations set body = 'x' $$, '42501', null, 'nadie las cambia desde la app');
reset role;

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-1e000000000a', 'a@lt.local', '{"username": "lt_ana"}');
select pg_temp.login('00000000-0000-0000-0000-1e000000000a');
select throws_ok($$ select public.admin_update_legal_translation(auth.uid(), 'cookies', 'en', 'Hack', 'x') $$, '42501', null, 'ni un usuario usa la función del panel');
reset role;
select set_config('request.jwt.claims', '', true);

set local role service_role;
select public.admin_update_legal_translation(gen_random_uuid(), 'cookies', 'en', 'Cookies', 'Nuevo texto', 'prueba');
reset role;
select is((select body from public.legal_translations where slug = 'cookies' and lang = 'en'), 'Nuevo texto', 'el panel la cambia');

select * from finish();
rollback;
