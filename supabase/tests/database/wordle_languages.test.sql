begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-f1000000000a', 'a@wl.local', '{"username": "wl_ana"}'),
  ('00000000-0000-0000-0000-f1000000000b', 'b@wl.local', '{"username": "wl_bob"}');
insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('00000000-0000-0000-0000-f1000000000a', '00000000-0000-0000-0000-f1000000000b', 'accepted', now());

create function pg_temp.login(id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true);
$$;
discard plans;

create temp table today as select private.game_day() as day;
grant select on today to authenticated, service_role;
delete from private.wordle_words where day = (select day from today);
set local role service_role;
select is((select word from public.wordle_today(array['perro'])), 'perro', 'sin idioma, la palabra en español');
select is((select word from public.wordle_today(array['house'], 'en')), 'house', 'cada idioma tiene su palabra del día');
select is((select word from public.wordle_today(array['perro'], 'es')), 'perro', 'y la española no cambia');

select public.wordle_add_guess('00000000-0000-0000-0000-f1000000000b', (select day from today), 'perro', 'ggggg');
select public.wordle_add_guess('00000000-0000-0000-0000-f1000000000b', (select day from today), 'house', 'ggggg', 'en');
select is((select count(*) from public.wordle_games where user_id = '00000000-0000-0000-0000-f1000000000b')::int, 2,
  'se juegan por separado las dos del día');
select throws_ok($$ select public.wordle_add_guess('00000000-0000-0000-0000-f1000000000b', (select day from today), 'perro', 'ggggg', 'fr') $$,
  '22023', null, 'solo español o inglés');
reset role;

select pg_temp.login('00000000-0000-0000-0000-f1000000000a');
select is((select count(*) from public.get_wordle_friends('en'))::int, 1, 'los resultados de amigos son de ese idioma');

select * from finish();
rollback;
