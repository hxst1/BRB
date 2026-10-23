begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-f5000000000a', 'a@fs.local', '{"username": "fs_ana"}'),
  ('00000000-0000-0000-0000-f5000000000b', 'b@fs.local', '{"username": "fs_bob"}');

select is((select first_steps_dismissed from public.profiles where id = '00000000-0000-0000-0000-f5000000000a'), false,
  'al registrarse se ven los primeros pasos');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;
select pg_temp.login('00000000-0000-0000-0000-f5000000000a');

update public.profiles set first_steps_dismissed = true where id = auth.uid();
select is((select first_steps_dismissed from public.profiles where id = '00000000-0000-0000-0000-f5000000000a'), true,
  'cada uno puede cerrarlos');

update public.profiles set first_steps_dismissed = true where id = '00000000-0000-0000-0000-f5000000000b';
select is((select first_steps_dismissed from public.profiles where id = '00000000-0000-0000-0000-f5000000000b'), false,
  'no se cierran los de otro');

select throws_ok($$ update public.profiles set xp = 9999 where id = auth.uid() $$, '42501', null,
  'el permiso es solo para esa columna');

set local role anon;
select throws_ok($$ update public.profiles set first_steps_dismissed = true $$, '42501', null, 'sin sesión, nada');

select * from finish();
rollback;
