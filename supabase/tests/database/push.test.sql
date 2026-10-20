begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-80000000000a', 'a@push.local', '{"username": "p_ana"}'),
  ('00000000-0000-0000-0000-80000000000b', 'b@push.local', '{"username": "p_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-80000000000a');
select lives_ok($$ select public.save_push_subscription('https://push.test/dispositivo-1', 'clave', 'auth') $$,
  'guarda la suscripción del dispositivo');
select is((select count(*) from public.push_subscriptions)::int, 1, 've sus dispositivos');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), 'https://push.test/x', 'k', 'a') $$, '42501', null, 'no se insertan directamente');

-- El mismo navegador con otra cuenta: la suscripción pasa a la nueva.
select pg_temp.login('00000000-0000-0000-0000-80000000000b');
select public.save_push_subscription('https://push.test/dispositivo-1', 'clave2', 'auth2');
select is((select count(*) from public.push_subscriptions)::int, 1, 'el dispositivo pasa a quien ha iniciado sesión');

select pg_temp.login('00000000-0000-0000-0000-80000000000a');
select is((select count(*) from public.push_subscriptions)::int, 0, 'y deja de ser de la cuenta anterior');
select public.delete_push_subscription('https://push.test/dispositivo-1');

select pg_temp.login('00000000-0000-0000-0000-80000000000b');
select is((select count(*) from public.push_subscriptions)::int, 1, 'nadie puede borrar dispositivos ajenos');
select public.delete_push_subscription('https://push.test/dispositivo-1');
select is((select count(*) from public.push_subscriptions)::int, 0, 'cada uno puede darse de baja');

select * from finish();
rollback;
