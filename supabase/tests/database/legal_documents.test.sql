begin;
select plan(5);

select is((select count(*) from public.legal_documents)::int, 3, 'hay términos, privacidad y cookies');

set local role anon;
select is((select count(*) from public.legal_documents)::int, 3, 'cualquiera puede leerlos, sin cuenta');
select throws_ok($$ update public.legal_documents set body = 'x' $$, '42501', null, 'pero nadie puede cambiarlos desde la app');
select throws_ok($$ select public.admin_update_legal_document(gen_random_uuid(), 'cookies', 'Cookies', 'x') $$, '42501', null,
  'ni usar la función del panel');
reset role;

select is(public.admin_update_legal_document(gen_random_uuid(), 'cookies', 'Política de cookies', 'Texto nuevo', 'prueba'), 2,
  'el panel los cambia y sube la versión');

select * from finish();
rollback;
