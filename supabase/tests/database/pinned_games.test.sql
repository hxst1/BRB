begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-d1000000000a', 'a@pin.local', '{"username": "pin_ana"}'),
  ('00000000-0000-0000-0000-d1000000000b', 'b@pin.local', '{"username": "pin_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

select pg_temp.login('00000000-0000-0000-0000-d1000000000a');
select is(public.toggle_pinned_game('sudoku'), true, 'fijar un juego');
select public.toggle_pinned_game('tron');
select results_eq($$ select game from public.pinned_games order by pinned_at, game $$,
  $$ values ('sudoku'::text), ('tron') $$, 'se ven los fijados');
select is(public.toggle_pinned_game('sudoku'), false, 'volver a pulsar lo quita');
select throws_ok($$ select public.toggle_pinned_game('Nada Raro!') $$, '23514', null, 'solo ids de juego válidos');
select throws_ok($$ insert into public.pinned_games (user_id, game) values (auth.uid(), 'snake') $$, '42501', null,
  'no se escribe directamente en la tabla');
select public.toggle_pinned_game(g) from unnest(array['a1', 'a2', 'a3', 'a4', 'a5']) g;
select throws_ok($$ select public.toggle_pinned_game('a6') $$, 'P0001', null, 'como mucho 6');

select pg_temp.login('00000000-0000-0000-0000-d1000000000b');
select is((select count(*) from public.pinned_games)::int, 0, 'nadie ve los fijados de otro');

set local role anon;
select throws_ok($$ select public.toggle_pinned_game('2048') $$, '42501', null, 'sin sesión no se fija nada');

select * from finish();
rollback;
