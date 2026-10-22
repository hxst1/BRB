begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-a1000000000a', 'a@ann.local', '{"username": "ann_ana"}'),
  ('00000000-0000-0000-0000-a1000000000b', 'b@ann.local', '{"username": "ann_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-a1000000000a');
select lives_ok($$ select public.mark_announcements_seen(array['tetris', 'solitario']) $$, 'marcar avisos como vistos');
select lives_ok($$ select public.mark_announcements_seen(array['tetris']) $$, 'repetir no falla');
select results_eq($$ select announcement from public.seen_announcements order by 1 $$,
  $$ values ('solitario'::text), ('tetris') $$, 'se ven los propios');
select throws_ok($$ insert into public.seen_announcements (user_id, announcement) values (auth.uid(), 'x') $$,
  '42501', null, 'no se escribe directamente en la tabla');

select pg_temp.login('00000000-0000-0000-0000-a1000000000b');
select is((select count(*) from public.seen_announcements)::int, 0, 'nadie ve los de otro');

set local role anon;
select throws_ok($$ select public.mark_announcements_seen(array['tetris']) $$, '42501', null, 'sin sesión no');

select * from finish();
rollback;
