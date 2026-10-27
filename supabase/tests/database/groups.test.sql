begin;
select plan(26);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-6f000000000a', 'a@gr.local', '{"username": "gr_ana"}'),
  ('00000000-0000-0000-0000-6f000000000b', 'b@gr.local', '{"username": "gr_bob"}'),
  ('00000000-0000-0000-0000-6f000000000c', 'c@gr.local', '{"username": "gr_carla"}');
update public.profiles set xp = 100 where id = '00000000-0000-0000-0000-6f000000000a';
update public.profiles set xp = 200 where id = '00000000-0000-0000-0000-6f000000000b';
update public.profiles set xp = 300 where id = '00000000-0000-0000-0000-6f000000000c';

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create temp table made (id uuid, code text);
grant all on made to anon, authenticated;
discard plans;

-- Ana crea el grupo.
set local role anon;
select throws_ok($$ select public.create_group('Oficina') $$, '42501', null, 'sin cuenta no se crean grupos');
reset role;

select pg_temp.login('00000000-0000-0000-0000-6f000000000a');
insert into made (id) select public.create_group('  Oficina ');
select pg_temp.logout();
update made set code = (select g.code from public.groups g where g.id = made.id);

select is((select name from public.groups where id = (select id from made)), 'Oficina', 'el nombre se guarda sin espacios de más');
select is((select count(*)::integer from public.group_members where group_id = (select id from made)), 1, 'quien lo crea ya está dentro');

set local role anon;
select results_eq($$ select name, members, joined from public.get_group_invite((select code from made)) $$,
  $$ values ('Oficina'::text, 1, false) $$, 'sin cuenta se ve la invitación');
select throws_ok($$ select * from public.get_level_leaderboard('group', 50, (select id from made)) $$, '28000', null,
  'pero no el ranking del grupo');
reset role;

-- Bob entra con el enlace.
select pg_temp.login('00000000-0000-0000-0000-6f000000000b');
select is((select count(*)::integer from public.groups), 0, 'antes de entrar no se ve el grupo');
select is(public.join_group(lower((select code from made))), (select id from made), 'se entra con el código');
select is(public.join_group((select code from made)), (select id from made), 'entrar otra vez no hace nada');
select is((select count(*)::integer from public.group_members where group_id = (select id from made)), 2, 'y ve a los dos miembros');
select is((select joined from public.get_group_invite((select code from made))), true, 'la invitación sabe que ya está dentro');
select results_eq($$ select username, rank from public.get_level_leaderboard('group', 50, (select id from made)) $$,
  $$ values ('gr_bob'::text, 1::bigint), ('gr_ana'::text, 2::bigint) $$, 'el ranking del grupo solo tiene a los del grupo');
select lives_ok($$ select * from public.get_leaderboard('2048', 'group', 'week', 50, (select id from made)) $$, 'también el de un juego');
select lives_ok($$ select * from public.get_match_leaderboard('{tictactoe}', 'group', 'all', 50, (select id from made)) $$, 'y el de partidas');
select throws_ok($$ select public.rename_group((select id from made), 'Mío') $$, '42501', null, 'solo el dueño cambia el nombre');
select throws_ok($$ select public.remove_group_member((select id from made), '00000000-0000-0000-0000-6f000000000a') $$, '42501', null,
  'o echa a alguien');
select throws_ok($$ select public.delete_group((select id from made)) $$, '42501', null, 'o lo borra');
select throws_ok($$ insert into public.group_members (group_id, user_id) values ((select id from made), '00000000-0000-0000-0000-6f000000000c') $$,
  '42501', null, 'no se mete a nadie a mano');
select pg_temp.logout();

-- Carla no está.
select pg_temp.login('00000000-0000-0000-0000-6f000000000c');
select is((select count(*)::integer from public.group_members where group_id = (select id from made)), 0, 'quien no está no ve a los miembros');
select throws_ok($$ select * from public.get_level_leaderboard('group', 50, (select id from made)) $$, '42501', null,
  'ni el ranking del grupo');
select pg_temp.logout();

-- El dueño.
select pg_temp.login('00000000-0000-0000-0000-6f000000000a');
select throws_ok($$ select public.rename_group((select id from made), '   ') $$, '23514', null, 'el nombre no puede quedar vacío');
select public.remove_group_member((select id from made), '00000000-0000-0000-0000-6f000000000b');
select is((select count(*)::integer from public.group_members where group_id = (select id from made)), 1, 'el dueño puede echar a alguien');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-6f000000000b');
select public.join_group((select code from made));
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-6f000000000a');
select public.leave_group((select id from made));
select pg_temp.logout();
select is((select owner_id from public.groups where id = (select id from made)), '00000000-0000-0000-0000-6f000000000b'::uuid,
  'si el dueño se va, el grupo pasa a otro miembro');

select pg_temp.login('00000000-0000-0000-0000-6f000000000b');
select public.leave_group((select id from made));
select pg_temp.logout();
select is((select count(*)::integer from public.groups where id = (select id from made)), 0, 'y si no queda nadie, se borra');

-- Si el dueño borra su cuenta, el grupo sigue con los demás.
delete from made;
select pg_temp.login('00000000-0000-0000-0000-6f000000000a');
insert into made (id) select public.create_group('Pandilla');
select pg_temp.logout();
update made set code = (select g.code from public.groups g where g.id = made.id);
select pg_temp.login('00000000-0000-0000-0000-6f000000000c');
select public.join_group((select code from made));
select pg_temp.logout();
delete from auth.users where id = '00000000-0000-0000-0000-6f000000000a';
select is((select owner_id from public.groups where id = (select id from made)), '00000000-0000-0000-0000-6f000000000c'::uuid,
  'si el dueño borra su cuenta, el grupo pasa a otro miembro');
select pg_temp.login('00000000-0000-0000-0000-6f000000000c');
select public.delete_group((select id from made));
select is((select count(*)::integer from public.groups where id = (select id from made)), 0, 'el dueño puede borrar el grupo');

-- Límite de grupos por persona.
select public.create_group('Grupo ' || i) from generate_series(1, 10) i;
select throws_ok($$ select public.create_group('Uno más') $$, '54000', null, 'como mucho 10 grupos');
select pg_temp.logout();

select * from finish();
rollback;
