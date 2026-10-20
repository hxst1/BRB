begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-a0000000000a', 'a@sup.local', '{"username": "s_ana"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-a0000000000a');
select throws_ok($$ select public.apply_supporter_event('o1', 'order_created', auth.uid(), true, '{}') $$,
  '42501', null, 'nadie puede hacerse supporter a sí mismo');
select throws_ok($$ select * from public.supporter_events $$, '42501', null, 'el registro de pagos no es visible');
reset role;

set local role service_role;
select is(public.apply_supporter_event('o1', 'order_created', '00000000-0000-0000-0000-a0000000000a', true, '{}'),
  true, 'el servidor aplica un pago verificado');
select is(public.apply_supporter_event('o1', 'order_created', '00000000-0000-0000-0000-a0000000000a', true, '{}'),
  false, 'un aviso repetido se ignora');
reset role;

select is((select supporter_tier from public.profiles where id = '00000000-0000-0000-0000-a0000000000a'),
  'supporter', 'pasa a ser supporter');

update public.profiles set avatar_parts = '{"top": "crown"}' where id = '00000000-0000-0000-0000-a0000000000a';
set local role service_role;
select public.apply_supporter_event('s1', 'subscription_expired', '00000000-0000-0000-0000-a0000000000a', false, '{}');
reset role;
select is((select supporter_tier from public.profiles where id = '00000000-0000-0000-0000-a0000000000a'),
  null, 'al caducar deja de serlo');
select is((select avatar_parts from public.profiles where id = '00000000-0000-0000-0000-a0000000000a'),
  '{}'::jsonb, 'y pierde las partes exclusivas');

select * from finish();
rollback;
