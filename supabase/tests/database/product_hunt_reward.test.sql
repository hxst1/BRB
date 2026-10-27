begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9a000000000a', 'a@ph.local', '{"username": "ph_ana"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

select throws_ok($$ select public.claim_launch_reward('producthunt') $$, '28000', null, 'sin sesión no se puede reclamar');

select pg_temp.login('00000000-0000-0000-0000-9a000000000a');
select is(public.claim_launch_reward('otra-web'), false, 'solo desde Product Hunt');
select is(public.claim_launch_reward('producthunt'), true, 'desde Product Hunt se lleva el premio');
select is(public.claim_launch_reward('producthunt'), false, 'una sola vez');
select pg_temp.logout();

select ok(exists (select 1 from public.user_achievements where user_id = '00000000-0000-0000-0000-9a000000000a' and achievement = 'product-hunt'),
  'y con él, el logro');
select is(private.part_achievement('top', 'launch'), 'product-hunt', 'que desbloquea el gorro');

select ok(not private.launch_reward_open(timestamptz '2026-11-05 00:00 Europe/Madrid'), 'pasada la semana del lanzamiento, ya no se puede');

set local role service_role;
select is((select claims from public.admin_launch_rewards() where source = 'producthunt'), 1::bigint, 'el panel ve cuántos lo han reclamado');
reset role;

select * from finish();
rollback;
