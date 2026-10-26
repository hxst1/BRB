begin;
select plan(12);

delete from private.visits;
-- Ayer a mediodía (hora de España), para que todo caiga en el mismo día de juego.
-- El referrer es lo que guarda visit-tracker: el dominio que enlazó o la etiqueta ?ref=.
create temp table t as select ((private.game_day() - 1) + time '12:00') at time zone 'Europe/Madrid' as noon;
insert into private.visits (ts, kind, visitor, path, referrer, country, device) select noon + x.offset_, x.kind, x.visitor, x.path, x.referrer, x.country, x.device
from t, (values
  -- a: llega desde Product Hunt (subdominio www), pasa 2 min y se registra.
  (interval '0', 'pageview', 'aaaaaaaaaaaaaaaa', '/', 'www.producthunt.com', 'US', 'mobile'),
  (interval '5 min', 'pageview', 'aaaaaaaaaaaaaaaa', '/reinas', 'www.producthunt.com', 'US', 'mobile'),
  (interval '10 min', 'leave', 'aaaaaaaaaaaaaaaa', '/reinas', '', 'US', 'mobile'),
  (interval '1 hour', 'signup', 'aaaaaaaaaaaaaaaa', '/entrar', '', 'US', 'mobile'),
  -- b: desde un enlace con ?ref=producthunt, 1 min, sin registrarse.
  (interval '2 hours', 'pageview', 'bbbbbbbbbbbbbbbb', '/reinas', 'producthunt', 'JP', 'desktop'),
  (interval '2 hours', 'leave', 'bbbbbbbbbbbbbbbb', '/reinas', '', 'JP', 'desktop'),
  -- c: desde otra web; su registro no cuenta.
  (interval '0', 'pageview', 'cccccccccccccccc', '/', 'google.com', 'ES', 'mobile'),
  (interval '30 min', 'signup', 'cccccccccccccccc', '/entrar', '', 'ES', 'mobile'),
  -- e: desde Twitter (t.co); f: desde reddit.com, que contiene "t.co" pero no es Twitter.
  (interval '3 hours', 'pageview', 'eeeeeeeeeeeeeeee', '/', 't.co', 'US', 'mobile'),
  (interval '3 hours', 'pageview', 'ffffffffffffffff', '/', 'reddit.com', 'US', 'desktop'),
  (interval '3 hours', 'pageview', '1111111111111111', '/', 'mobile.twitter.com', 'GB', 'mobile'),
  -- a, al día siguiente (su huella sería otra): no se le atribuye.
  (interval '1 day', 'signup', 'aaaaaaaaaaaaaaaa', '/entrar', '', 'US', 'mobile'),
  -- Hace más de 90 días: fuera.
  (interval '-100 days', 'pageview', 'dddddddddddddddd', '/', 'producthunt.com', 'FR', 'mobile')
) as x(offset_, kind, visitor, path, referrer, country, device);
update private.visits set seconds = 120 where visitor = 'aaaaaaaaaaaaaaaa' and kind = 'leave';
update private.visits set seconds = 60 where visitor = 'bbbbbbbbbbbbbbbb' and kind = 'leave';

set local role service_role;
select results_eq($$ select visitors, pageviews, signups, avg_seconds from public.admin_referrer_summary('{producthunt.com,producthunt}', now() - interval '200 days') $$,
  $$ values (2, 3, 1, 90) $$, 'Product Hunt (dominio y etiqueta): 2 visitantes, 3 páginas, 1 registro y 90 s de media; lo de hace más de 90 días no cuenta');
select results_eq($$ select visitors, pageviews from public.admin_referrer_summary('{producthunt.com}', now() - interval '7 days') $$,
  $$ values (1, 2) $$, 'solo el dominio: sin la etiqueta, b no cuenta (y www. vale como subdominio)');
select results_eq($$ select visitors from public.admin_referrer_summary('{t.co,x.com,twitter.com,twitter}', now() - interval '7 days') $$,
  $$ values (2) $$, 'Twitter: t.co y mobile.twitter.com, pero no reddit.com aunque contenga "t.co"');
select results_eq($$ select visitors, pageviews, signups from public.admin_referrer_hourly('{producthunt.com,producthunt}', now() - interval '7 days') $$,
  $$ values (1, 2, 0), (0, 0, 1), (1, 1, 0) $$, 'hora a hora: el registro, en su hora');
select results_eq($$ select value, visitors, signups from public.admin_referrer_top('{producthunt.com,producthunt}', now() - interval '7 days', 'country') $$,
  $$ values ('JP'::text, 1, 0), ('US', 1, 1) $$, 'por país');
select results_eq($$ select value, visitors, signups from public.admin_referrer_top('{producthunt.com,producthunt}', now() - interval '7 days', 'path') $$,
  $$ values ('/reinas'::text, 2, 1), ('/', 1, 1) $$, 'por página');
select throws_ok($$ select * from public.admin_referrer_top('{producthunt.com}', now(), 'visitor') $$, '22023', null, 'solo país, dispositivo o página');
select throws_ok($$ select * from public.admin_referrer_summary('{%}', now()) $$, '22023', null, 'cada origen se valida');
select throws_ok($$ select * from public.admin_referrer_summary('{producthunt.com,PRODUCT HUNT}', now()) $$, '22023', null, 'todos: solo minúsculas, cifras, puntos y guiones');
select throws_ok($$ select * from public.admin_referrer_summary('{}', now()) $$, '22023', null, 'al menos uno');
reset role;

set local role authenticated;
select throws_ok($$ select * from public.admin_referrer_summary('{producthunt.com}', now()) $$, '42501', null, 'la app no puede leerlas');
reset role;
set local role anon;
select throws_ok($$ select * from public.admin_referrer_top('{producthunt.com}', now(), 'country') $$, '42501', null, 'ni sin sesión');
reset role;

select * from finish();
rollback;
