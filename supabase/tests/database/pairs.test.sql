begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-9b000000000a', 'a@pairs.local', '{"username": "pr_ana"}');

insert into public.game_runs (id, user_id, game, seed) values
  ('00000000-0000-0000-0000-9b00000000f1', '00000000-0000-0000-0000-9b000000000a', 'pairs', 1),
  ('00000000-0000-0000-0000-9b00000000f2', '00000000-0000-0000-0000-9b000000000a', 'snake', 2);

create function pg_temp.moves(id uuid) returns text language sql as $$
  select moves from public.game_runs where game_runs.id = moves.id;
$$;
discard plans;

select ok(public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f1', 0, '3'), 'apunta el primer giro');
select ok(public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f1', 1, 'j'), 'y el siguiente');
select is(pg_temp.moves('00000000-0000-0000-0000-9b00000000f1'), '3j', 'los giros quedan en orden');

select ok(not public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f1', 1, '4'),
  'si entre medias ha entrado otro giro, no se apunta');
select ok(not public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f1', 2, 'k'), 'solo cartas válidas (0-9, a-j)');
select ok(not public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f2', 0, '1'), 'solo en partidas de Parejas');

update public.game_runs set status = 'abandoned' where id = '00000000-0000-0000-0000-9b00000000f1';
select ok(not public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f1', 2, '5'), 'solo en partidas en curso');
select is(pg_temp.moves('00000000-0000-0000-0000-9b00000000f1'), '3j', 'los rechazados no cambian nada');

set local role authenticated;
select throws_ok($$ select public.record_pairs_flip('00000000-0000-0000-0000-9b00000000f1', 2, '5') $$, '42501', null,
  'los jugadores no pueden apuntar giros: solo el servidor');
reset role;

select * from finish();
rollback;
