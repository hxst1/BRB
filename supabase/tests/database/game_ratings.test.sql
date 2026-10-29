begin;
select plan(17);

-- Sin las valoraciones que ya hubiera en la base (se deshace al acabar): el resumen solo ve las del test.
delete from public.game_ratings;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9c000000000a', 'a@ratings.local', '{"username": "gr_ana"}'),
  ('00000000-0000-0000-0000-9c000000000b', 'b@ratings.local', '{"username": "gr_bob"}');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.rating(uid uuid, g text) returns public.game_ratings language sql as $$
  select * from public.game_ratings where user_id = uid and game = g;
$$;
discard plans;

-- Ana rechaza el 2048 dos veces y luego responde; valora Snake con comentario.
select pg_temp.login('00000000-0000-0000-0000-9c000000000a');
select public.dismiss_game_rating('2048', 3);
reset role;
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', '2048')).dismissals, 1::smallint, '"Ahora no" apunta un rechazo');
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', '2048')).rating, null, 'sin respuesta');

select pg_temp.login('00000000-0000-0000-0000-9c000000000a');
select public.dismiss_game_rating('2048', 8);
reset role;
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', '2048')).dismissals, 2::smallint, 'el segundo rechazo también');
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', '2048')).games_played, 8, 'con las partidas que llevaba');

select pg_temp.login('00000000-0000-0000-0000-9c000000000a');
select public.rate_game('2048', 3::smallint, '  ', 12, 'es', 'abc1234');
select public.rate_game('snake', 1::smallint, 'Demasiado rápido al principio', 4, 'en', 'abc1234');
select public.dismiss_game_rating('snake', 9);
reset role;
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', '2048')).rating, 3::smallint, 'responder después completa la fila');
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', '2048')).comment, null, 'un comentario en blanco no se guarda');
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', 'snake')).dismissals, 0::smallint,
  'rechazar después de responder no cambia nada');

select pg_temp.login('00000000-0000-0000-0000-9c000000000a');
select public.rate_game('snake', 2::smallint, null, 6);
reset role;
select is((pg_temp.rating('00000000-0000-0000-0000-9c000000000a', 'snake')).rating, 2::smallint, 'se puede cambiar la respuesta');
select is((select count(*)::integer from public.game_ratings where user_id = '00000000-0000-0000-0000-9c000000000a'), 2,
  'una sola fila por juego');

select pg_temp.login('00000000-0000-0000-0000-9c000000000a');
select throws_ok($$ select public.rate_game('pairs', 4::smallint) $$, '23514', null, 'solo respuestas de 1 a 3');
select throws_ok($$ select public.rate_game('pairs', 2::smallint, repeat('x', 1501)) $$, '23514', null, 'comentarios de 1500 caracteres como mucho');
reset role;

-- Bob no ve las de Ana.
select pg_temp.login('00000000-0000-0000-0000-9c000000000b');
select is((select count(*)::integer from public.game_ratings), 0, 'cada uno ve solo las suyas');
select throws_ok($$ select * from public.admin_game_ratings_summary() $$, '42501', null, 'los jugadores no ven el resumen del panel');
select throws_ok($$ select * from public.admin_list_game_ratings() $$, '42501', null, 'ni la lista');
reset role;

set local role anon;
select throws_ok($$ select public.rate_game('2048', 3::smallint) $$, '42501', null, 'sin sesión, no se valora');
reset role;

-- Panel: solo cuentan las respuestas (no los rechazos sin responder).
select pg_temp.login('00000000-0000-0000-0000-9c000000000b');
select public.dismiss_game_rating('2048', 3);
reset role;
select results_eq(
  $$ select game, ratings, count_1, count_2, count_3, comments from public.admin_game_ratings_summary() $$,
  $$ values ('2048', 1, 0, 0, 1, 0), ('snake', 1, 0, 1, 0, 0) $$,
  'el resumen cuenta solo las respuestas, por juego'
);
select results_eq(
  $$ select game, rating, username from public.admin_list_game_ratings(max_rating => 2::smallint) $$,
  $$ values ('snake'::text, 2::smallint, 'gr_ana'::text) $$,
  'la lista filtra por respuesta y dice quién'
);

select * from finish();
rollback;
