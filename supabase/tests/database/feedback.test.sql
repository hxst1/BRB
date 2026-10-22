begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-fb000000000a', 'a@fb.local', '{"username": "fb_ana"}'),
  ('00000000-0000-0000-0000-fb000000000b', 'b@fb.local', '{"username": "fb_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-fb000000000a');
select lives_ok($$ select public.submit_feedback('bug', 'El tablero no carga', null, '/sudoku', 'Firefox', 'abc1234') $$, 'reportar un problema');
select lives_ok($$ select public.submit_feedback('rating', null, 5::smallint) $$, 'valorar con estrellas, sin texto');
select throws_ok($$ select public.submit_feedback('rating', 'genial', 7::smallint) $$, '23514', null, 'de 1 a 5 estrellas');
select throws_ok($$ select public.submit_feedback('idea', '  ') $$, '23514', null, 'una idea necesita texto');
select throws_ok($$ insert into public.feedback (user_id, kind, body) values (auth.uid(), 'idea', 'hola hola') $$,
  '42501', null, 'no se escribe directamente en la tabla');
select throws_ok($$ update public.feedback set status = 'done' $$, '42501', null, 'ni se cambia el estado');
select is((select count(*) from public.feedback)::int, 2, 'cada uno ve sus mensajes');

select public.submit_feedback('idea', 'idea ' || g) from generate_series(1, 3) g;
select throws_ok($$ select public.submit_feedback('idea', 'una más') $$, 'P0001', null, 'como mucho 5 por hora');

select pg_temp.login('00000000-0000-0000-0000-fb000000000b');
select is((select count(*) from public.feedback)::int, 0, 'y no los de los demás');

set local role anon;
select throws_ok($$ select public.submit_feedback('idea', 'sin cuenta') $$, '42501', null, 'sin sesión no se envía nada');
reset role;
select pg_temp.logout();

-- El panel (service_role) responde: replied_at se rellena solo.
update public.feedback set status = 'seen', admin_reply = 'Gracias, lo miramos'
where user_id = '00000000-0000-0000-0000-fb000000000a' and kind = 'bug';
select isnt((select replied_at from public.feedback where user_id = '00000000-0000-0000-0000-fb000000000a' and kind = 'bug'),
  null, 'responder guarda la fecha de la respuesta');

select * from finish();
rollback;
