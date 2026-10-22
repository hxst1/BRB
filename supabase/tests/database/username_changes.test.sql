begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0c000000000a', 'a@name.local', '{"username": "name_ana"}'),
  ('00000000-0000-0000-0000-0c000000000b', 'b@name.local', '{"username": "name_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-0c000000000a');
select lives_ok($$ update public.profiles set username = 'name_ana2' where id = auth.uid() $$, 'cambiarse el nombre');
select throws_ok($$ update public.profiles set username = 'name_ana3' where id = auth.uid() $$, 'P0001', null,
  'pero no otra vez hasta dentro de 7 días');
select lives_ok($$ update public.profiles set avatar_seed = 5 where id = auth.uid() $$, 'el resto del perfil se sigue pudiendo cambiar');
select throws_ok($$ update public.profiles set username = 'NAME_BOB' where id = auth.uid() $$, '23505', null,
  'ni coger un nombre ya usado (sin importar mayúsculas)');

-- El panel de admin (sin sesión de usuario) no tiene límite.
reset role;
select set_config('request.jwt.claims', '', true);
select lives_ok($$ update public.profiles set username = 'name_ana4' where id = '00000000-0000-0000-0000-0c000000000a' $$,
  'el admin puede renombrar aunque sea reciente');

select * from finish();
rollback;
