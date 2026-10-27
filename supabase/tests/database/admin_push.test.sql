begin;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-ad000000000a', 'a@ap.local', '{"username": "ap_ana"}');

-- Peticiones que pg_net tiene en cola (el webhook del panel y el de la app).
create function pg_temp.queued() returns integer language sql as $$
  select count(*)::integer from net.http_request_queue where url like '%/api/avisos';
$$;
discard plans;

-- Suscripciones
set local role service_role;
select isnt(public.admin_save_push_subscription('00000000-0000-0000-0000-ad000000000a', 'https://push.example/1', 'clave', 'auth'), null,
  'el panel guarda una suscripción');
select lives_ok($$ select public.admin_save_push_subscription('00000000-0000-0000-0000-ad000000000a', 'https://push.example/1', 'otra', 'auth2') $$,
  'guardarla otra vez la actualiza');
select results_eq($$ select endpoint, p256dh from public.admin_list_push_subscriptions() $$, $$ values ('https://push.example/1'::text, 'otra'::text) $$,
  'una sola por dispositivo, con las claves nuevas');
select public.admin_delete_push_subscription('https://push.example/1');
select is((select count(*)::integer from public.admin_list_push_subscriptions()), 0, 'y se borra por endpoint');
reset role;
select is((select count(*)::integer from private.admin_audit where action = 'push_subscribe'), 2, 'suscribirse queda en la auditoría');

set local role authenticated;
select throws_ok($$ select * from public.admin_list_push_subscriptions() $$, '42501', null, 'un usuario no puede ver las suscripciones');
select throws_ok($$ select public.admin_delete_push_subscription('x') $$, '42501', null, 'ni borrarlas');
reset role;

-- Avisos
select is(pg_temp.queued(), 0, 'sin novedades, nada en cola');
insert into public.feedback (user_id, kind, body) values ('00000000-0000-0000-0000-ad000000000a', 'bug', 'Algo falla');
select is(pg_temp.queued(), 1, 'un fallo avisa al panel');
insert into public.feedback (user_id, kind, rating) values ('00000000-0000-0000-0000-ad000000000a', 'rating', 5);
select is(pg_temp.queued(), 1, 'una valoración de 5 estrellas, no');
insert into public.feedback (user_id, kind, rating) values ('00000000-0000-0000-0000-ad000000000a', 'rating', 2);
insert into private.error_groups (fingerprint, message, source) values ('fp-test', 'Error de prueba', 'client');
update private.error_groups set status = 'resolved' where fingerprint = 'fp-test';
update private.error_groups set status = 'open' where fingerprint = 'fp-test';
select is(pg_temp.queued(), 4, 'una de 2 estrellas, un error nuevo y uno que se reabre, sí');
insert into public.supporter_events (provider, provider_ref, event, user_id, active, payload)
values ('kofi', 'test-1', 'order_created', '00000000-0000-0000-0000-ad000000000a', true, '{}');
select is(pg_temp.queued(), 5, 'y un apoyo nuevo');
select is(private.admin_notify_signups(), (select count(*)::integer from public.profiles where created_at > now() - interval '1 hour'),
  'cada hora, las cuentas nuevas');

select * from finish();
rollback;
