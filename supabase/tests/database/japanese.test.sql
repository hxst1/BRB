begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-1a000000000a', 'a@ja.local', '{"username": "ja_hana", "locale": "ja"}'),
  ('00000000-0000-0000-0000-1a000000000b', 'b@ja.local', '{"username": "ja_ken"}');

select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1a000000000a'), 'ja', 'se registra en japonés con el idioma del formulario');
select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1a000000000b'), 'es', 'sin idioma, sigue siendo español');
select ok(
  (select prosecdef from pg_proc where oid = 'private.set_user_locale()'::regprocedure),
  'el trigger del registro sigue siendo security definer'
);

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;
select pg_temp.login('00000000-0000-0000-0000-1a000000000b');

update public.profiles set locale = 'ja' where id = auth.uid();
select is((select locale from public.profiles where id = '00000000-0000-0000-0000-1a000000000b'), 'ja', 'cada uno puede pasarse al japonés');
select throws_ok($$ update public.profiles set locale = 'fr' where id = auth.uid() $$, '23514', null, 'solo español, inglés o japonés');
reset role;

set local role service_role;
select lives_ok($$ select public.record_visit('pageview', 'abcdefabcdef1a1a', '/ja', 'ja', '', 'JP', 'mobile') $$, 'se guardan visitas en japonés');
select throws_ok($$ select public.record_visit('pageview', 'abcdefabcdef1a1a', '/fr', 'fr') $$, '23514', null, 'pero no de otros idiomas');
reset role;
select is((select count(*) from private.visits where visitor = 'abcdefabcdef1a1a' and lang = 'ja')::int, 1, 'con su idioma');

-- El Wordle no tiene palabras en japonés: la app en japonés pide las inglesas.
set local role service_role;
select throws_ok($$ select * from public.wordle_today(array['house'], 'ja') $$, '22023', null, 'no hay Wordle en japonés');
reset role;

select * from finish();
rollback;
