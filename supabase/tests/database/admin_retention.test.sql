begin;
select plan(4);

-- Tres cuentas de hace 10 días: una vuelve al día siguiente y juega, otra vuelve a los 5 días, otra nunca.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-4e000000000a', 'a@rt.local', '{"username": "rt_ana"}'),
  ('00000000-0000-0000-0000-4e000000000b', 'b@rt.local', '{"username": "rt_bob"}'),
  ('00000000-0000-0000-0000-4e000000000c', 'c@rt.local', '{"username": "rt_carla"}');
update public.profiles set created_at = (private.game_day() - 10)::timestamptz + interval '12 hours'
where id in ('00000000-0000-0000-0000-4e000000000a', '00000000-0000-0000-0000-4e000000000b', '00000000-0000-0000-0000-4e000000000c');
insert into private.daily_activity (day, user_id) values
  (private.game_day() - 9, '00000000-0000-0000-0000-4e000000000a'),
  (private.game_day() - 5, '00000000-0000-0000-0000-4e000000000b');
insert into private.streak_log (user_id, day, kind) values ('00000000-0000-0000-0000-4e000000000a', private.game_day() - 9, 'played');
create temp table today as select private.game_day() as day;
grant select on today to service_role;
discard plans;

set local role service_role;
select results_eq(
  $$ select signups, played, d1, week1 from public.admin_retention() where cohort = (select day - 10 from today) $$,
  $$ values (3, 1, 1, 2) $$,
  'de las tres: una jugó, una volvió al día siguiente y dos en la primera semana');
select is((select d1 from public.admin_retention() where cohort = (select day from today)), null, 'el día de hoy aún no tiene vuelta');
reset role;

set local role authenticated;
select throws_ok($$ select * from public.admin_retention() $$, '42501', null, 'un usuario no puede verlo');
reset role;
set local role anon;
select throws_ok($$ select * from public.admin_retention() $$, '42501', null, 'ni sin cuenta');
reset role;

select * from finish();
rollback;
