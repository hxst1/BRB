begin;
select plan(15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-f0000000000a', 'a@wordle.local', '{"username": "w_ana"}'),
  ('00000000-0000-0000-0000-f0000000000b', 'b@wordle.local', '{"username": "w_bob"}'),
  ('00000000-0000-0000-0000-f0000000000c', 'c@wordle.local', '{"username": "w_carla"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-f0000000000a', '00000000-0000-0000-0000-f0000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
discard plans;

create temp table today as select (now() at time zone 'Europe/Madrid')::date as day;
grant select on today to authenticated, service_role;

-- --- La palabra ------------------------------------------------------------------

-- Puede que otro test o el uso local ya haya fijado la de hoy: se parte de cero.
delete from private.wordle_words;

-- Ayer salió "gatos": entre "gatos" y "perro", hoy toca "perro".
insert into private.wordle_words (day, word) values ((select day from today) - 1, 'gatos');
set local role service_role;
select is((select word from public.wordle_today(array['gatos', 'perro'])), 'perro', 'elige una palabra que no haya salido');
select is((select word from public.wordle_today(array['nubes'])), 'perro', 'y las siguientes llamadas devuelven la misma');
reset role;
delete from private.wordle_words where day = (select day from today);
set local role service_role;
select is((select word from public.wordle_today(array['gatos'])), 'gatos', 'si ya salieron todas, repite');
reset role;
update private.wordle_words set word = 'perro' where day = (select day from today);

select pg_temp.login('00000000-0000-0000-0000-f0000000000a');
select throws_ok($$ select * from public.wordle_today(array['hacks']) $$, '42501', null, 'un jugador no puede pedir la palabra');
select throws_ok($$ select * from private.wordle_words $$, '42501', null, 'ni leerla de la tabla');
select throws_ok($$ select public.wordle_add_guess(auth.uid(), (select day from today), 'perro', 'ggggg') $$, '42501', null,
  'ni registrar sus propios intentos');
select pg_temp.logout();

-- --- Intentos ---------------------------------------------------------------------

set local role service_role;
select public.wordle_add_guess('00000000-0000-0000-0000-f0000000000a', (select day from today), 'cielo', 'bbybg');
select results_eq(
  $$ select public.wordle_add_guess('00000000-0000-0000-0000-f0000000000a', (select day from today), 'perro', 'ggggg') is not null $$,
  $$ values (true) $$, 'acertar al segundo intento');
select throws_ok(
  $$ select public.wordle_add_guess('00000000-0000-0000-0000-f0000000000a', (select day from today), 'gatos', 'bbbbg') $$,
  'P0001', null, 'no se puede seguir tras acertar');
select throws_ok(
  $$ select public.wordle_add_guess('00000000-0000-0000-0000-f0000000000a', (select day from today) - 1, 'gatos', 'bbbbg') $$,
  'P0001', null, 'no se juega la palabra de otro día');

-- B falla los 6.
select public.wordle_add_guess('00000000-0000-0000-0000-f0000000000b', (select day from today), w, 'bbbbb')
from unnest(array['gatos', 'cielo', 'nubes', 'playa', 'queso', 'huevo']) w;
select throws_ok(
  $$ select public.wordle_add_guess('00000000-0000-0000-0000-f0000000000b', (select day from today), 'mango', 'bbbbb') $$,
  'P0001', null, 'como mucho 6 intentos');
reset role;

select results_eq(
  $$ select solved, cardinality(guesses), finished_at is not null from public.wordle_games
     where user_id = '00000000-0000-0000-0000-f0000000000a' $$,
  $$ values (true, 2, true) $$, 'la partida queda acertada en 2');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-f0000000000a'), 9,
  'acertar en 2 da 9 de XP');
select is((select streak_days from public.profiles where id = '00000000-0000-0000-0000-f0000000000b'), 1,
  'terminar, aunque sea fallando, cuenta para la racha');

-- --- Resultados de amigos ------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-f0000000000a');
select results_eq($$ select username, attempts, solved from public.get_wordle_friends() $$,
  $$ values ('w_ana'::text, 2, true), ('w_bob'::text, 6, false) $$, 'ves tu resultado y el de tus amigos');
select pg_temp.login('00000000-0000-0000-0000-f0000000000c');
select is((select count(*) from public.get_wordle_friends()), 0::bigint, 'pero no el de desconocidos');
select pg_temp.logout();

select * from finish();
rollback;
