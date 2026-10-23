begin;
select plan(2);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-5a000000000a', 'a@sw.local', '{"username": "sw_ana"}');
insert into public.wordle_games (user_id, day, lang, guesses, patterns, solved, finished_at)
values ('00000000-0000-0000-0000-5a000000000a', private.game_day(), 'es', '{perro}', '{ggggg}', true, now()),
       ('00000000-0000-0000-0000-5a000000000a', private.game_day(), 'en', '{house}', '{ggggg}', true, now());

set local role service_role;
select is((select plays from public.admin_games_played(30) where game = 'wordle') >= 2, true, 'el Wordle sale en los juegos jugados');
select is((select solo_runs from public.admin_daily_stats(1) order by day desc limit 1) >= 2, true, 'y suma en las partidas en solitario del día');

select * from finish();
rollback;
