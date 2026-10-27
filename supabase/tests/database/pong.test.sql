begin;
select plan(12);

-- El XP extra del duelo del día depende de la fecha: aquí no cuenta.
alter table public.matches disable trigger daily_duel_on_match_finished;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-90000000000a', 'a@pong.local', '{"username": "g_ana"}'),
  ('00000000-0000-0000-0000-90000000000b', 'b@pong.local', '{"username": "g_bob"}'),
  ('00000000-0000-0000-0000-90000000000c', 'c@pong.local', '{"username": "g_carla"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-90000000000a', '00000000-0000-0000-0000-90000000000b', 'accepted', now());

-- Dos partidas activas (A-B y A-C): una para el caso de acuerdo y otra para el de disputa.
insert into public.matches (id, game, player_x, player_o, created_by, status) values
  ('00000000-0000-0000-0000-9000000000f1', 'pong', '00000000-0000-0000-0000-90000000000a', '00000000-0000-0000-0000-90000000000b', '00000000-0000-0000-0000-90000000000a', 'active'),
  ('00000000-0000-0000-0000-9000000000f2', 'pong', '00000000-0000-0000-0000-90000000000a', '00000000-0000-0000-0000-90000000000c', '00000000-0000-0000-0000-90000000000a', 'active');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

-- Canal privado
select pg_temp.login('00000000-0000-0000-0000-90000000000a');
select is(private.can_join_pong('pong:00000000-0000-0000-0000-9000000000f1'), true, 'un jugador puede entrar en el canal');
select is(private.can_join_pong('pong:nada'), false, 'temas mal formados no');
select pg_temp.login('00000000-0000-0000-0000-90000000000c');
select is(private.can_join_pong('pong:00000000-0000-0000-0000-9000000000f1'), false, 'un tercero no puede entrar en el canal');
select throws_ok($$ select private.award_xp(auth.uid(), 1000) $$, '42501', null, 'las funciones internas no se pueden llamar');

-- Resultado de acuerdo
select pg_temp.login('00000000-0000-0000-0000-90000000000a');
select is((select my_turn from public.get_pending_counts()), 2, 'las partidas de pong aceptadas cuentan como pendientes');
select throws_ok($$ select public.report_pong_result('00000000-0000-0000-0000-9000000000f1', 4, 3) $$,
  '23514', null, 'el marcador tiene que tener un ganador con 5');
select is(public.report_pong_result('00000000-0000-0000-0000-9000000000f1', 5, 3), 'waiting', 'espera al otro jugador');
select is((select my_turn from public.get_pending_counts()), 1, 'tras informar, deja de estar pendiente');

select pg_temp.login('00000000-0000-0000-0000-90000000000b');
select is(public.report_pong_result('00000000-0000-0000-0000-9000000000f1', 5, 3), 'finished', 'si coinciden, la partida termina');
select is((select winner || ':' || end_reason from public.matches where id = '00000000-0000-0000-0000-9000000000f1'),
  'x:points', 'gana X por puntos');

-- Resultado en disputa
select pg_temp.login('00000000-0000-0000-0000-90000000000a');
select public.report_pong_result('00000000-0000-0000-0000-9000000000f2', 5, 0);
select pg_temp.login('00000000-0000-0000-0000-90000000000c');
select is(public.report_pong_result('00000000-0000-0000-0000-9000000000f2', 2, 5), 'disputed', 'si no coinciden, queda en disputa');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-90000000000a'),
  10, 'la partida en disputa no da XP (solo cuenta la ganada)');

select * from finish();
rollback;
