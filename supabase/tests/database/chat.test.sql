begin;
select plan(18);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-50000000000a', 'a@chat.local', '{"username": "h_ana"}'),
  ('00000000-0000-0000-0000-50000000000b', 'b@chat.local', '{"username": "h_bob"}'),
  ('00000000-0000-0000-0000-50000000000c', 'c@chat.local', '{"username": "h_carla"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-50000000000a', '00000000-0000-0000-0000-50000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-50000000000a');
select throws_ok($$ select public.send_message('00000000-0000-0000-0000-50000000000c', 'hola') $$,
  'P0001', null, 'solo se escribe a amigos');
select throws_ok($$ select public.send_message('00000000-0000-0000-0000-50000000000b', '   ') $$,
  '22023', null, 'no se envían mensajes vacíos');
select throws_ok(format('select public.send_message(%L, %L)', '00000000-0000-0000-0000-50000000000b', repeat('a', 1001)),
  '22023', null, 'ni demasiado largos');
select throws_ok($$ insert into public.messages (sender_id, recipient_id, body)
  values (auth.uid(), '00000000-0000-0000-0000-50000000000b', 'hola') $$,
  '42501', null, 'no se puede insertar directamente');

select is((public.send_message('00000000-0000-0000-0000-50000000000b', '  ¿una partida?  ')).body,
  '¿una partida?', 'envía el mensaje recortando espacios');

select pg_temp.login('00000000-0000-0000-0000-50000000000b');
select is(public.get_unread_messages(), 1, 'el destinatario tiene un mensaje sin leer');
select is((select unread from public.get_conversations() where friend_id = '00000000-0000-0000-0000-50000000000a'),
  1, 'la conversación muestra los no leídos');
select is((select last_body from public.get_conversations() where friend_id = '00000000-0000-0000-0000-50000000000a'),
  '¿una partida?', 'y el último mensaje');
select public.mark_conversation_read('00000000-0000-0000-0000-50000000000a');
select is(public.get_unread_messages(), 0, 'marcar como leída pone los no leídos a cero');
select throws_ok($$ update public.messages set body = 'editado' $$, '42501', null, 'no se pueden editar mensajes');

select pg_temp.login('00000000-0000-0000-0000-50000000000c');
select is((select count(*) from public.messages)::int, 0, 'terceros no ven los mensajes');
select is((select count(*) from public.get_conversations())::int, 0, 'sin amigos no hay conversaciones');

-- Límite de ritmo: ya lleva 1 mensaje este minuto, 29 más llegan a 30.
select pg_temp.login('00000000-0000-0000-0000-50000000000a');
select lives_ok($$ do $do$ begin for i in 1..29 loop perform public.send_message('00000000-0000-0000-0000-50000000000b', 'spam ' || i); end loop; end $do$ $$,
  'permite 30 mensajes por minuto');
select throws_ok($$ select public.send_message('00000000-0000-0000-0000-50000000000b', 'uno más') $$,
  'P0001', null, 'a partir de 30 por minuto se bloquea');

-- Retos dentro del chat.
discard plans;
select pg_temp.login('00000000-0000-0000-0000-50000000000a');
create temp table embed_match as select public.create_match('tictactoe', '00000000-0000-0000-0000-50000000000b') as id;
select is(
  (select kind || ':' || body from public.messages where ref_id = (select id from embed_match)),
  'match:Reto al 3 en raya', 'retar al 3 en raya publica la tarjeta en el chat');
select is(
  (select recipient_id from public.messages where ref_id = (select id from embed_match)),
  '00000000-0000-0000-0000-50000000000b'::uuid, 'la recibe el retado');
select is(public.create_match('tictactoe', '00000000-0000-0000-0000-50000000000b'), (select id from embed_match),
  'repetir el reto devuelve la misma partida…');
select is((select count(*) from public.messages where kind = 'match')::int, 1, '…y no duplica la tarjeta');

select * from finish();
rollback;
