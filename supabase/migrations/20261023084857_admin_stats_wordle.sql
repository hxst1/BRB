-- Estadísticas del panel: el Wordle no contaba porque sus partidas van en
-- public.wordle_games, no en game_runs. Ahora sale en los juegos jugados
-- (como 'solo'/'wordle') y suma en las partidas en solitario de cada día.

create or replace function public.admin_games_played(days integer default 30)
returns table (kind text, game text, plays integer, players integer)
language sql
stable
security definer
set search_path = ''
as $$
  select 'solo', r.game, count(*)::integer, count(distinct r.user_id)::integer
  from public.game_runs r
  where r.status = 'finished' and r.finished_at >= private.days_start(admin_games_played.days)
  group by r.game
  union all
  select 'match', m.game, count(distinct m.id)::integer, count(distinct player)::integer
  from public.matches m
  cross join lateral unnest(array[m.player_x, m.player_o]) player
  where m.status = 'finished' and m.updated_at >= private.days_start(admin_games_played.days)
  group by m.game
  union all
  -- El Wordle se guarda aparte (una partida por día y por idioma).
  select 'solo', 'wordle', count(*)::integer, count(distinct w.user_id)::integer
  from public.wordle_games w
  where w.finished_at >= private.days_start(admin_games_played.days)
  having count(*) > 0
  order by 3 desc;
$$;

create or replace function public.admin_daily_stats(days integer default 30)
returns table (day date, active_users integer, new_users integer, solo_runs integer, matches integer, messages integer)
language sql
stable
security definer
set search_path = ''
as $$
  with span as (
    select private.days_start(admin_daily_stats.days) as since
  ), days as (
    select d::date as day
    from span, generate_series(private.game_day(span.since), private.game_day(), interval '1 day') d
  ), active as (
    select a.day, count(*) as n from private.daily_activity a, span
    where a.day >= private.game_day(span.since) group by a.day
  ), joined as (
    select private.game_day(p.created_at) as day, count(*) as n from public.profiles p, span
    where p.created_at >= span.since group by 1
  ), runs as (
    select private.game_day(r.finished_at) as day, count(*) as n from public.game_runs r, span
    where r.status = 'finished' and r.finished_at >= span.since group by 1
  ), wordles as (
    select private.game_day(w.finished_at) as day, count(*) as n from public.wordle_games w, span
    where w.finished_at >= span.since group by 1
  ), played as (
    select private.game_day(m.updated_at) as day, count(*) as n from public.matches m, span
    where m.status = 'finished' and m.updated_at >= span.since group by 1
  ), sent as (
    select private.game_day(m.created_at) as day, count(*) as n from public.messages m, span
    where m.created_at >= span.since group by 1
  )
  select days.day,
         coalesce(active.n, 0)::integer, coalesce(joined.n, 0)::integer, (coalesce(runs.n, 0) + coalesce(wordles.n, 0))::integer,
         coalesce(played.n, 0)::integer, coalesce(sent.n, 0)::integer
  from days
  left join active on active.day = days.day
  left join joined on joined.day = days.day
  left join runs on runs.day = days.day
  left join wordles on wordles.day = days.day
  left join played on played.day = days.day
  left join sent on sent.day = days.day
  order by days.day;
$$;
