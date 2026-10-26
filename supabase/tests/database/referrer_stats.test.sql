begin;
select plan(9);

delete from private.visits;
-- Ayer a mediodía (hora de España), para que todo caiga en el mismo día de juego.
create temp table t as select ((private.game_day() - 1) + time '12:00') at time zone 'Europe/Madrid' as noon;
insert into private.visits (ts, kind, visitor, path, referrer, country, device) select noon + x.offset_, x.kind, x.visitor, x.path, x.referrer, x.country, x.device
from t, (values
  -- a: llega desde Product Hunt, pasa 2 min y se registra.
  (interval '0', 'pageview', 'aaaaaaaaaaaaaaaa', '/', 'https://www.producthunt.com/', 'US', 'mobile'),
  (interval '5 min', 'pageview', 'aaaaaaaaaaaaaaaa', '/reinas', 'https://www.producthunt.com/', 'US', 'mobile'),
  (interval '10 min', 'leave', 'aaaaaaaaaaaaaaaa', '/reinas', '', 'US', 'mobile'),
  (interval '1 hour', 'signup', 'aaaaaaaaaaaaaaaa', '/entrar', '', 'US', 'mobile'),
  -- b: desde Product Hunt, 1 min, sin registrarse.
  (interval '2 hours', 'pageview', 'bbbbbbbbbbbbbbbb', '/reinas', 'https://www.producthunt.com/', 'JP', 'desktop'),
  (interval '2 hours', 'leave', 'bbbbbbbbbbbbbbbb', '/reinas', '', 'JP', 'desktop'),
  -- c: desde otra web; su registro no cuenta.
  (interval '0', 'pageview', 'cccccccccccccccc', '/', 'https://google.com/', 'ES', 'mobile'),
  (interval '30 min', 'signup', 'cccccccccccccccc', '/entrar', '', 'ES', 'mobile'),
  -- a, al día siguiente (su huella sería otra): no se le atribuye.
  (interval '1 day', 'signup', 'aaaaaaaaaaaaaaaa', '/entrar', '', 'US', 'mobile'),
  -- Hace más de 90 días: fuera.
  (interval '-100 days', 'pageview', 'dddddddddddddddd', '/', 'https://www.producthunt.com/', 'FR', 'mobile')
) as x(offset_, kind, visitor, path, referrer, country, device);
update private.visits set seconds = 120 where visitor = 'aaaaaaaaaaaaaaaa' and kind = 'leave';
update private.visits set seconds = 60 where visitor = 'bbbbbbbbbbbbbbbb' and kind = 'leave';

set local role service_role;
select results_eq($$ select visitors, pageviews, signups, avg_seconds from public.admin_referrer_summary('producthunt.com', now() - interval '200 days') $$,
  $$ values (2, 3, 1, 90) $$, 'resumen: 2 visitantes, 3 páginas, 1 registro y 90 s de media (lo de hace más de 90 días no cuenta)');
select results_eq($$ select visitors, pageviews, signups from public.admin_referrer_hourly('producthunt.com', now() - interval '7 days') $$,
  $$ values (1, 2, 0), (0, 0, 1), (1, 1, 0) $$, 'hora a hora: el registro, en su hora');
select results_eq($$ select value, visitors, signups from public.admin_referrer_top('producthunt.com', now() - interval '7 days', 'country') $$,
  $$ values ('JP'::text, 1, 0), ('US', 1, 1) $$, 'por país');
select results_eq($$ select value, visitors, signups from public.admin_referrer_top('producthunt.com', now() - interval '7 days', 'path') $$,
  $$ values ('/reinas'::text, 2, 1), ('/', 1, 1) $$, 'por página');
select throws_ok($$ select * from public.admin_referrer_top('producthunt.com', now(), 'visitor') $$, '22023', null, 'solo país, dispositivo o página');
select throws_ok($$ select * from public.admin_referrer_summary('%', now()) $$, '22023', null, 'el origen se valida');
select throws_ok($$ select * from public.admin_referrer_summary('PRODUCT HUNT', now()) $$, '22023', null, 'solo minúsculas, cifras, puntos y guiones');
reset role;

set local role authenticated;
select throws_ok($$ select * from public.admin_referrer_summary('producthunt.com', now()) $$, '42501', null, 'la app no puede leerlas');
reset role;
set local role anon;
select throws_ok($$ select * from public.admin_referrer_top('producthunt.com', now(), 'country') $$, '42501', null, 'ni sin sesión');
reset role;

select * from finish();
rollback;
