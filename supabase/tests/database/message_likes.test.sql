begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-11000000000a', 'a@ml.local', '{"username": "ml_ana"}'),
  ('00000000-0000-0000-0000-11000000000b', 'b@ml.local', '{"username": "ml_bob"}'),
  ('00000000-0000-0000-0000-11000000000c', 'c@ml.local', '{"username": "ml_carla"}');
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-11000000000a', '00000000-0000-0000-0000-11000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create temp table ids (id uuid);
grant all on ids to authenticated, anon;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-11000000000a');
insert into ids select (public.send_message('00000000-0000-0000-0000-11000000000b', 'Hola')).id;
select pg_temp.login('00000000-0000-0000-0000-11000000000b');
select is(public.like_message((select id from ids)), array['00000000-0000-0000-0000-11000000000b']::uuid[], 'el otro le da me gusta');
select is(public.like_message((select id from ids)), array['00000000-0000-0000-0000-11000000000b']::uuid[], 'dos veces no cuenta doble');
select pg_temp.login('00000000-0000-0000-0000-11000000000a');
select is(cardinality(public.like_message((select id from ids))), 2, 'y quien lo escribió, también');
select is(public.like_message((select id from ids), false), array['00000000-0000-0000-0000-11000000000b']::uuid[], 'se puede quitar');
select is((select liked_by from public.messages where id = (select id from ids)), array['00000000-0000-0000-0000-11000000000b']::uuid[],
  'y se ve en el mensaje');
select pg_temp.login('00000000-0000-0000-0000-11000000000c');
select throws_ok($$ select public.like_message((select id from ids)) $$, 'P0002', 'Mensaje no encontrado', 'nadie más puede darle me gusta');
select pg_temp.logout();
set local role anon;
select throws_ok($$ select public.like_message((select id from ids)) $$, '42501', null, 'ni sin cuenta');
reset role;

select * from finish();
rollback;
