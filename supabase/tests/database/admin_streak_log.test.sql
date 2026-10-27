begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-5c000000000a', 'a@sl.local', '{"username": "sl_ana"}');
insert into private.streak_log (user_id, day, kind) values
  ('00000000-0000-0000-0000-5c000000000a', private.game_day() - 200, 'played'),
  ('00000000-0000-0000-0000-5c000000000a', private.game_day() - 2, 'frozen'),
  ('00000000-0000-0000-0000-5c000000000a', private.game_day() - 1, 'played');
-- El día de hoy, antes de cambiar de rol (service_role no ve el esquema private).
create temp table today as select private.game_day() as day;
grant select on today to service_role;
discard plans;

set local role service_role;
select results_eq($$ select day, kind from public.admin_user_streak_log('00000000-0000-0000-0000-5c000000000a') $$,
  $$ select day - 2, 'frozen'::text from today union all select day - 1, 'played' from today $$,
  'el panel ve los días de los últimos 120, en orden');
select is((select count(*)::integer from public.admin_user_streak_log('00000000-0000-0000-0000-5c000000000a', 365)), 3, 'y más atrás si lo pide');
reset role;

set local role authenticated;
select throws_ok($$ select * from public.admin_user_streak_log('00000000-0000-0000-0000-5c000000000a') $$, '42501', null, 'un usuario no puede verlo');
reset role;
set local role anon;
select throws_ok($$ select * from public.admin_user_streak_log('00000000-0000-0000-0000-5c000000000a') $$, '42501', null, 'ni sin cuenta');
reset role;

select * from finish();
rollback;
