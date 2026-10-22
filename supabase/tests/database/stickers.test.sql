begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-5c000000000a', 'a@stk.local', '{"username": "stk_ana"}'),
  ('00000000-0000-0000-0000-5c000000000b', 'b@stk.local', '{"username": "stk_bob"}'),
  ('00000000-0000-0000-0000-5c000000000c', 'c@stk.local', '{"username": "stk_carla"}');
insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('00000000-0000-0000-0000-5c000000000a', '00000000-0000-0000-0000-5c000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-5c000000000a');
select is((select body || '|' || kind from public.send_sticker('00000000-0000-0000-0000-5c000000000b', 'laugh')),
  '😂|sticker', 'un sticker se guarda como su emoji, de tipo sticker');
select throws_ok($$ select public.send_sticker('00000000-0000-0000-0000-5c000000000b', 'dance') $$, '22023', null,
  'solo stickers que existen');
select throws_ok($$ select public.send_sticker('00000000-0000-0000-0000-5c000000000c', 'cry') $$, 'P0001', null,
  'solo a amigos');
select is((select count(*) from public.messages where kind = 'sticker')::int, 1, 'se ve en la conversación');

set local role anon;
select throws_ok($$ select public.send_sticker('00000000-0000-0000-0000-5c000000000b', 'sad') $$, '42501', null, 'sin sesión no');

select * from finish();
rollback;
