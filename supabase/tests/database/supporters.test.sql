begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-a0000000000a', 'a@sup.local', '{"username": "s_ana"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-a0000000000a');
select throws_ok($$ select public.apply_supporter_event('kofi', 'o1', 'Donation', auth.uid(), true, '{}') $$,
  '42501', null, 'nadie puede hacerse supporter a sí mismo');
select throws_ok($$ select * from public.supporter_events $$, '42501', null, 'el registro de pagos no es visible');
select throws_ok($$ select public.user_id_by_email('a@sup.local') $$, '42501', null, 'nadie puede buscar cuentas por email');
select throws_ok($$ select public.user_id_by_friend_code('AAAAA') $$, '42501', null, 'ni por código de amigo');
reset role;

set local role service_role;
select is(public.apply_supporter_event('kofi', 'o1', 'Donation', '00000000-0000-0000-0000-a0000000000a', true, '{}'),
  true, 'el servidor aplica un pago verificado');
select is(public.apply_supporter_event('kofi', 'o1', 'Donation', '00000000-0000-0000-0000-a0000000000a', true, '{}'),
  false, 'un aviso repetido se ignora');
reset role;

select is((select supporter_tier from public.profiles where id = '00000000-0000-0000-0000-a0000000000a'),
  'supporter', 'pasa a ser supporter');
set local role service_role;
select is(public.user_id_by_email(' A@Sup.Local '), '00000000-0000-0000-0000-a0000000000a'::uuid,
  'el servidor encuentra la cuenta por email, sin importar mayúsculas ni espacios');
select is(public.user_id_by_email('nadie@sup.local'), null, 'y null si no hay ninguna');
select is(public.user_id_by_friend_code(lower((select code from public.friend_codes where user_id = '00000000-0000-0000-0000-a0000000000a'))),
  '00000000-0000-0000-0000-a0000000000a'::uuid, 'y por su código de amigo, escrito como sea');
reset role;

update public.profiles set avatar_parts = '{"top": "crown"}' where id = '00000000-0000-0000-0000-a0000000000a';
set local role service_role;
select public.apply_supporter_event('github', 's1', 'cancelled', '00000000-0000-0000-0000-a0000000000a', false, '{}');
reset role;
select is((select supporter_tier from public.profiles where id = '00000000-0000-0000-0000-a0000000000a'),
  null, 'al caducar deja de serlo');
select is((select avatar_parts from public.profiles where id = '00000000-0000-0000-0000-a0000000000a'),
  '{}'::jsonb, 'y pierde las partes exclusivas');

select * from finish();
rollback;
