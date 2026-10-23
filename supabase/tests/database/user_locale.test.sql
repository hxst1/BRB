begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-1c000000000a', 'a@lc.local', '{"username": "lc_en", "locale": "en"}'),
  ('00000000-0000-0000-0000-1c000000000b', 'b@lc.local', '{"username": "lc_es"}'),
  ('00000000-0000-0000-0000-1c000000000c', 'c@lc.local', '{"username": "lc_xx", "locale": "fr"}');

select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1c000000000a'), 'en', 'se registra con el idioma del formulario');
select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1c000000000b'), 'es', 'sin idioma, español');
select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1c000000000c'), 'es', 'un idioma desconocido no se guarda');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;
select pg_temp.login('00000000-0000-0000-0000-1c000000000b');

update public.profiles set locale = 'en' where id = '00000000-0000-0000-0000-1c000000000b';
select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1c000000000b'), 'en', 'cada uno cambia su idioma');
select throws_ok($$ update public.profiles set locale = 'fr' where id = auth.uid() $$, '23514', null, 'solo español o inglés');

select * from finish();
rollback;
