begin;
select plan(10);

delete from private.visits;
set local role service_role;
select public.record_visit('pageview', 'aaaaaaaaaaaaaaaa', '/', 'es', 'google.com', 'ES', 'mobile');
select public.record_visit('pageview', 'aaaaaaaaaaaaaaaa', '/2048', 'es', '', 'ES', 'mobile');
select public.record_visit('leave', 'aaaaaaaaaaaaaaaa', '/2048', 'es', '', 'ES', 'mobile', false, 90);
select public.record_visit('signup', 'aaaaaaaaaaaaaaaa', '/entrar', 'es', '', 'ES', 'mobile');
select public.record_visit('pageview', 'bbbbbbbbbbbbbbbb', '/en', 'en', '', 'US', 'desktop', true);
select public.record_visit('leave', 'bbbbbbbbbbbbbbbb', '/en', 'en', '', 'US', 'desktop', true, 30);

reset role;
select is((select count(*) from private.visits where kind = 'pageview' and seconds is not null)::int, 0, 'las páginas vistas no llevan segundos');
set local role service_role;
select results_eq($$ select visitors, pageviews, avg_seconds, signups, signed_in_visitors from public.admin_visits_summary(30) $$,
  $$ values (2, 3, 60, 1, 1) $$, 'resumen: visitantes, páginas, tiempo medio, registros y con sesión');
select results_eq($$ select country, visitors, signups from public.admin_visits_by_country(30) order by country $$,
  $$ values ('ES'::text, 1, 1), ('US', 1, 0) $$, 'por país');
select is((select avg_seconds from public.admin_visits_by_country(30) where country = 'ES'), 90, 'con su tiempo a la vista');
select is((select sum(pageviews) from public.admin_visits_daily(7))::int, 3, 'día a día');
select results_eq($$ select value, pageviews from public.admin_visits_top('path', 30) order by value $$,
  $$ values ('/'::text, 1), ('/2048', 1), ('/en', 1) $$, 'páginas más vistas');
select throws_ok($$ select * from public.admin_visits_top('visitor') $$, '22023', null, 'no se puede sacar el hash del visitante');
select throws_ok($$ select public.record_visit('pageview', 'no-es-un-hash') $$, '23514', null, 'el visitante es un hash');
reset role;

set local role authenticated;
select throws_ok($$ select public.record_visit('pageview', 'cccccccccccccccc') $$, '42501', null, 'la app no puede escribir visitas directamente');
select throws_ok($$ select * from public.admin_visits_summary() $$, '42501', null, 'ni leer las estadísticas');
reset role;

select * from finish();
rollback;
