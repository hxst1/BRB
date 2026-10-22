-- Reto diario de varios juegos: uno por día de la semana y sorpresa el fin de semana.
--
--   lunes 2048 · martes Snake · miércoles Buscaminas (medio) · jueves Lights Out
--   viernes Sudoku (medio) · sábado y domingo: uno de los cinco, al azar
--
-- El juego de cada día se guarda con su semilla en private.daily_seeds, así
-- que no cambia aunque se cambie la rotación. Los días anteriores eran 2048.
-- La rotación también está en apps/web/src/lib/daily.ts (lo comprueba un test).

alter table private.daily_seeds add column game text;
update private.daily_seeds set game = '2048' where game is null;

-- Juego y semilla del reto de ese día (los crea si aún no existen).
create function private.daily_challenge(at_day date)
returns table (game text, seed bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pool text[] := array['2048', 'snake', 'minesweeper-medium', 'lightsout', 'sudoku-medium'];
begin
  insert into private.daily_seeds (day) values (at_day) on conflict do nothing;
  update private.daily_seeds s
  set game = case extract(isodow from at_day)::integer
    when 1 then '2048'
    when 2 then 'snake'
    when 3 then 'minesweeper-medium'
    when 4 then 'lightsout'
    when 5 then 'sudoku-medium'
    else pool[1 + (s.seed % cardinality(pool))::integer]
  end
  where s.day = at_day and s.game is null;
  return query select s.game, s.seed from private.daily_seeds s where s.day = at_day;
end;
$$;

-- Qué toca hoy y mañana (para todos, también sin sesión).
create function public.get_daily_info()
returns table (day date, game text, next_game text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
begin
  return query
  select today, (select c.game from private.daily_challenge(today) c), (select c.game from private.daily_challenge(today + 1) c);
end;
$$;

-- Empieza el reto de hoy (el juego que toque). Devuelve también qué juego es.
drop function public.start_daily_run();
create function public.start_daily_run()
returns table (id uuid, seed bigint, game text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  challenge record;
  attempt public.game_runs;
  started record;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  -- El mismo cerrojo que begin_run: dos pestañas a la vez no pueden pasar ambas la comprobación.
  perform pg_advisory_xact_lock(hashtextextended('start_run:' || auth.uid()::text, 0));

  select * into attempt from public.game_runs r where r.user_id = auth.uid() and r.daily = today;
  if attempt.id is not null then
    if attempt.status = 'playing' and attempt.started_at > now() - interval '10 seconds' then
      return query select attempt.id, attempt.seed, attempt.game;
      return;
    end if;
    raise exception 'Ya has jugado el reto de hoy' using errcode = 'P0001', hint = 'already_played';
  end if;

  select * into challenge from private.daily_challenge(today);
  select * into started from private.begin_run(challenge.game, challenge.seed);
  update public.game_runs r set daily = today where r.id = started.id;

  return query select started.id, started.seed, challenge.game;
end;
$$;

-- Ranking del reto de hoy: de mejor a peor según el juego (en los de tiempo gana el menor).
create or replace function public.get_daily_leaderboard(scope text default 'global', max_rows integer default 50)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_seed bigint,
  avatar_parts jsonb,
  supporter_tier text,
  score integer,
  achieved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if scope not in ('global', 'friends') then
    raise exception 'scope no válido: %', scope using errcode = '22023';
  elsif scope = 'friends' and auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  return query
  select
    rank() over (order by private.rank_key(r.game, r.score)),
    p.id,
    p.username,
    p.avatar_seed,
    p.avatar_parts,
    p.supporter_tier,
    r.score,
    r.finished_at
  from public.game_runs r
  join public.profiles p on p.id = r.user_id
  where r.daily = private.game_day()
    and r.status = 'finished'
    and private.in_scope(scope, r.user_id)
  order by private.rank_key(r.game, r.score), r.finished_at
  limit least(greatest(max_rows, 1), 100);
end;
$$;

-- Resumen del reto de hoy, ahora con el juego de hoy y el de mañana.
drop function public.get_my_daily();
create function public.get_my_daily()
returns table (
  day date,
  game text,
  next_game text,
  status text,
  score integer,
  rank bigint,
  players bigint,
  streak_days integer,
  streak_best integer,
  played_today boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  today_game text := (select c.game from private.daily_challenge(today) c);
  tomorrow_game text := (select c.game from private.daily_challenge(today + 1) c);
begin
  return query
  with board as (
    select r.user_id, rank() over (order by private.rank_key(r.game, r.score)) as rank
    from public.game_runs r
    where r.daily = today and r.status = 'finished'
  ), mine as (
    select r.status, r.score from public.game_runs r
    where r.user_id = auth.uid() and r.daily = today
  )
  select
    today,
    today_game,
    tomorrow_game,
    coalesce((select mine.status from mine), 'available'),
    (select mine.score from mine where mine.status = 'finished'),
    (select board.rank from board where board.user_id = auth.uid()),
    (select count(*) from board),
    case when p.streak_last_day >= today - 1 then p.streak_days else 0 end,
    p.streak_best,
    coalesce(p.streak_last_day = today, false)
  from public.profiles p
  where p.id = auth.uid();
end;
$$;

revoke execute on function
  public.start_daily_run(),
  public.get_my_daily(),
  public.get_daily_info()
from public, anon, authenticated;
grant execute on function public.start_daily_run(), public.get_my_daily() to authenticated;
grant execute on function public.get_daily_info() to anon, authenticated;
revoke execute on function private.daily_challenge(date) from public;

-- Da por perdida una partida propia en curso (p. ej. pisar una mina): queda
-- 'abandoned'. Así el reto diario pasa a "intento usado" en vez de quedarse en juego.
create function public.abandon_run(run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_runs r
  set status = 'abandoned', finished_at = now()
  where r.id = abandon_run.run_id and r.user_id = auth.uid() and r.status = 'playing';
  if not found then
    raise exception 'Partida no encontrada o ya cerrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.abandon_run(uuid) from public, anon, authenticated;
grant execute on function public.abandon_run(uuid) to authenticated;
