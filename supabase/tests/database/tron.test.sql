begin;
select plan(12);

-- El XP extra del duelo del día depende de la fecha: aquí no cuenta.
alter table public.matches disable trigger daily_duel_on_match_finished;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-7000000000aa', 'a@tron.local', '{"username": "t_ana"}'),
  ('00000000-0000-0000-0000-7000000000bb', 'b@tron.local', '{"username": "t_bob"}'),
  ('00000000-0000-0000-0000-7000000000cc', 'c@tron.local', '{"username": "t_carla"}');

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-7000000000aa', '00000000-0000-0000-0000-7000000000bb', 'accepted', now());

-- Dos partidas activas (A-B y A-C): una para el caso de acuerdo y otra para el de disputa.
insert into public.matches (id, game, player_x, player_o, created_by, status) values
  ('00000000-0000-0000-0000-7000000000f1', 'tron', '00000000-0000-0000-0000-7000000000aa', '00000000-0000-0000-0000-7000000000bb', '00000000-0000-0000-0000-7000000000aa', 'active'),
  ('00000000-0000-0000-0000-7000000000f2', 'tron', '00000000-0000-0000-0000-7000000000aa', '00000000-0000-0000-0000-7000000000cc', '00000000-0000-0000-0000-7000000000aa', 'active');

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

-- Canal privado
select pg_temp.login('00000000-0000-0000-0000-7000000000aa');
select is(private.can_join_tron('tron:00000000-0000-0000-0000-7000000000f1'), true, 'un jugador puede entrar en el canal');
select is(private.can_join_tron('tron:nada'), false, 'temas mal formados no');
select pg_temp.login('00000000-0000-0000-0000-7000000000cc');
select is(private.can_join_tron('tron:00000000-0000-0000-0000-7000000000f1'), false, 'un tercero no puede entrar en el canal');
select throws_ok($$ select private.award_xp(auth.uid(), 1000) $$, '42501', null, 'las funciones internas no se pueden llamar');

-- Resultado de acuerdo
select pg_temp.login('00000000-0000-0000-0000-7000000000aa');
select is((select my_turn from public.get_pending_counts()), 2, 'las partidas de Tron aceptadas cuentan como pendientes');
select throws_ok($$ select public.report_tron_result('00000000-0000-0000-0000-7000000000f1', 2, 1) $$,
  '23514', null, 'el marcador tiene que tener un ganador con 3');
select is(public.report_tron_result('00000000-0000-0000-0000-7000000000f1', 3, 1), 'waiting', 'espera al otro jugador');
select is((select my_turn from public.get_pending_counts()), 1, 'tras informar, deja de estar pendiente');

select pg_temp.login('00000000-0000-0000-0000-7000000000bb');
select is(public.report_tron_result('00000000-0000-0000-0000-7000000000f1', 3, 1), 'finished', 'si coinciden, la partida termina');
select is((select winner || ':' || end_reason from public.matches where id = '00000000-0000-0000-0000-7000000000f1'),
  'x:points', 'gana X por puntos');

-- Resultado en disputa
select pg_temp.login('00000000-0000-0000-0000-7000000000aa');
select public.report_tron_result('00000000-0000-0000-0000-7000000000f2', 3, 0);
select pg_temp.login('00000000-0000-0000-0000-7000000000cc');
select is(public.report_tron_result('00000000-0000-0000-0000-7000000000f2', 2, 3), 'disputed', 'si no coinciden, queda en disputa');
select is((select xp from public.profiles where id = '00000000-0000-0000-0000-7000000000aa'),
  10, 'la partida en disputa no da XP (solo cuenta la ganada)');

select * from finish();
rollback;
