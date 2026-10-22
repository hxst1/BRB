begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-4e000000000a', 'a@ref.local', '{"username": "ref_ana"}');

-- Cinco invitados por ana, con su código (y uno que intenta invitarse a sí mismo no cuenta).
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-4e00000000' || lpad(g::text, 2, '0'))::uuid, 'i' || g || '@ref.local',
       jsonb_build_object('username', 'ref_inv' || g, 'invited_by',
         lower((select code from public.friend_codes where user_id = '00000000-0000-0000-0000-4e000000000a')))
from generate_series(1, 5) g;

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

select is((select count(*) from private.referrals where referrer_id = '00000000-0000-0000-0000-4e000000000a')::int, 5,
  'quien se registra con el código de alguien queda como invitado suyo');
select is((select count(*) from public.friendships where requester_id = '00000000-0000-0000-0000-4e000000000a' and status = 'accepted')::int, 5,
  'y pasan a ser amigos');

select pg_temp.login('00000000-0000-0000-0000-4e000000000a');
select results_eq($$ select invited, active from public.get_my_referrals() $$, $$ values (5, 0) $$, 'ana ve a cuántos ha invitado');
select pg_temp.logout();

select is((select count(*) from public.user_achievements where user_id = '00000000-0000-0000-0000-4e000000000a' and achievement = 'referrals-5')::int, 0,
  'registrarse no basta: tienen que jugar');

-- Juegan los cinco una partida.
insert into public.game_runs (id, user_id, game, seed, status)
select gen_random_uuid(), ('00000000-0000-0000-0000-4e00000000' || lpad(g::text, 2, '0'))::uuid, '2048', 1, 'playing' from generate_series(1, 5) g;
update public.game_runs set status = 'finished', score = 100, max_tile = 16, finished_at = now()
where user_id::text like '00000000-0000-0000-0000-4e00000000%' and status = 'playing';

select ok(exists (select 1 from public.user_achievements where user_id = '00000000-0000-0000-0000-4e000000000a' and achievement = 'referrals-5'),
  'con 5 invitados que han jugado, ana gana el logro Embajador');

select pg_temp.login('00000000-0000-0000-0000-4e000000000a');
select results_eq($$ select invited, active from public.get_my_referrals() $$, $$ values (5, 5) $$, 'y cuentan los cinco');
select throws_ok($$ select * from private.referrals $$, '42501', null, 'la tabla de invitaciones no se ve desde la app');

select * from finish();
rollback;
