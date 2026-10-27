-- Retos diarios (varios) y rachas con protector.
--
-- Retos: cada día hay cuatro, cada uno con un intento:
--   puzzle  Sudoku, Reinas, Buscaminas (los tres en medio) o Solitario.
--   arcade  2048, Snake o Lights Out.
--   wordle  el Wordle del día (ya era diario; aquí solo se cuenta).
--   duel    el duelo del día: terminar una partida de ese juego contra un amigo.
-- El puzle, el arcade y el duelo van rotando día a día (la rotación también
-- está en apps/web/src/lib/daily.ts, y su test comprueba que coincide). Las
-- partidas del puzle y el arcade son partidas normales con `daily` y
-- `daily_slot` puestos. Los días anteriores (un solo reto) se reparten por
-- juego entre puzzle y arcade.
--
-- Racha: igual que antes (cualquier partida terminada cuenta), pero ahora se
-- guarda qué días se jugó (para el calendario) y hay protectores: cada 7 días
-- de racha se gana uno (como mucho 2). Si un día no juegas, al volver a jugar
-- se gasta uno por cada día perdido y la racha sigue.

-- ---------------------------------------------------------------------------
-- Retos de cada día
-- ---------------------------------------------------------------------------

create table private.daily_slots (
  day date not null,
  slot text not null check (slot in ('puzzle', 'arcade')),
  game text not null,
  seed bigint not null default private.random_uint32(),
  primary key (day, slot)
);

-- Juego que toca en una lista que rota: un día, el siguiente; da igual el día de la semana.
create function private.daily_rotation(pool text[], at_day date)
returns text
language sql
immutable
set search_path = ''
as $$
  select pool[1 + ((at_day - date '2026-01-05') % cardinality(pool) + cardinality(pool)) % cardinality(pool)];
$$;

create function private.daily_pool(slot text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case slot
    when 'puzzle' then array['sudoku-medium', 'queens-medium', 'minesweeper-medium', 'solitaire']
    when 'arcade' then array['2048', 'snake', 'lightsout']
    when 'duel' then array['connect4', 'reversi', 'dots', 'tictactoe', 'typing', 'battleship', 'rps', 'pong', 'tron']
  end;
$$;

-- Juego y semilla de un reto (los crea si aún no existen). Si ese día ya tenía
-- el reto único de antes, se aprovecha su juego y su semilla en su hueco.
create function private.daily_slot(at_day date, slot text)
returns table (game text, seed bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  legacy record;
begin
  if daily_slot.slot not in ('puzzle', 'arcade') then
    raise exception 'Reto no válido: %', daily_slot.slot using errcode = '22023';
  end if;

  if not exists (select 1 from private.daily_slots s where s.day = at_day and s.slot = daily_slot.slot) then
    select s.game, s.seed into legacy from private.daily_seeds s where s.day = at_day;
    if legacy.game = any (private.daily_pool(daily_slot.slot)) then
      insert into private.daily_slots (day, slot, game, seed) values (at_day, daily_slot.slot, legacy.game, legacy.seed)
      on conflict do nothing;
    else
      insert into private.daily_slots (day, slot, game)
      values (at_day, daily_slot.slot, private.daily_rotation(private.daily_pool(daily_slot.slot), at_day))
      on conflict do nothing;
    end if;
  end if;

  return query select s.game, s.seed from private.daily_slots s where s.day = at_day and s.slot = daily_slot.slot;
end;
$$;

create function private.daily_duel(at_day date)
returns text
language sql
immutable
set search_path = ''
as $$
  select private.daily_rotation(private.daily_pool('duel'), at_day);
$$;

revoke execute on function
  private.daily_rotation(text[], date),
  private.daily_pool(text),
  private.daily_slot(date, text),
  private.daily_duel(date)
from public;

-- Qué toca hoy (y mañana), para todos, también sin sesión. El Wordle no sale: es siempre el mismo.
create function public.get_daily_challenges()
returns table (day date, slot text, game text, next_game text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
begin
  return query
  select today, s.slot,
    case s.slot when 'duel' then private.daily_duel(today) else (select c.game from private.daily_slot(today, s.slot) c) end,
    case s.slot when 'duel' then private.daily_duel(today + 1) else (select c.game from private.daily_slot(today + 1, s.slot) c) end
  from unnest(array['puzzle', 'arcade', 'duel']) with ordinality s(slot, n)
  order by s.n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Intentos: uno por reto y día
-- ---------------------------------------------------------------------------

alter table public.game_runs add column daily_slot text check (daily_slot in ('puzzle', 'arcade'));

update public.game_runs
set daily_slot = case when game = any (private.daily_pool('puzzle')) then 'puzzle' else 'arcade' end
where daily is not null;

alter table public.game_runs add constraint game_runs_daily_slot check ((daily is null) = (daily_slot is null));

drop index public.game_runs_one_daily_idx;
create unique index game_runs_one_daily_idx on public.game_runs (user_id, daily, daily_slot) where daily is not null;

-- Empieza el reto de hoy de ese juego (sin juego, el arcade, como antes).
drop function public.start_daily_run();
create function public.start_daily_run(daily_game text default null)
returns table (id uuid, seed bigint, game text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  target text;
  challenge record;
  attempt public.game_runs;
  started record;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  select s.slot into target
  from unnest(array['puzzle', 'arcade']) s(slot)
  where start_daily_run.daily_game is null and s.slot = 'arcade'
     or (select c.game from private.daily_slot(today, s.slot) c) = start_daily_run.daily_game;
  if target is null then
    raise exception 'Ese juego no es reto hoy' using errcode = 'P0001', hint = 'not_today';
  end if;

  -- El mismo cerrojo que begin_run: dos pestañas a la vez no pueden pasar ambas la comprobación.
  perform pg_advisory_xact_lock(hashtextextended('start_run:' || auth.uid()::text, 0));
  select * into attempt from public.game_runs r where r.user_id = auth.uid() and r.daily = today and r.daily_slot = target;
  if attempt.id is not null then
    if attempt.status = 'playing' and attempt.started_at > now() - interval '10 seconds' then
      return query select attempt.id, attempt.seed, attempt.game;
      return;
    end if;
    raise exception 'Ya has jugado el reto de hoy' using errcode = 'P0001', hint = 'already_played';
  end if;

  select * into challenge from private.daily_slot(today, target);
  select * into started from private.begin_run(challenge.game, challenge.seed);
  update public.game_runs r set daily = today, daily_slot = target where r.id = started.id;
  return query select started.id, started.seed, challenge.game;
end;
$$;

-- Ranking del reto de hoy de ese juego (sin juego, el del arcade): en los de tiempo gana el menor.
drop function public.get_daily_leaderboard(text, integer);
create function public.get_daily_leaderboard(scope text default 'global', max_rows integer default 50, game text default null)
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
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  board_game text := coalesce(get_daily_leaderboard.game, (select c.game from private.daily_slot(today, 'arcade') c));
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
  where r.daily = today
    and r.game = board_game
    and r.status = 'finished'
    and private.in_scope(scope, r.user_id)
  order by private.rank_key(r.game, r.score), r.finished_at
  limit least(greatest(max_rows, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------
-- Duelo del día
-- ---------------------------------------------------------------------------

create table private.daily_duels (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  match_id uuid not null references public.matches (id) on delete cascade,
  primary key (user_id, day)
);

-- XP del duelo del día, además de la de la partida.
create function private.daily_duel_on_match_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  player uuid;
begin
  -- Rendirse o un marcador en disputa no cuentan: así no se puede completar sin jugar.
  if new.game is distinct from private.daily_duel(today)
     or new.end_reason not in ('line', 'rounds', 'points', 'fleet', 'checkmate', 'draw') then
    return null;
  end if;
  foreach player in array array[new.player_x, new.player_o] loop
    insert into private.daily_duels (user_id, day, match_id) values (player, today, new.id) on conflict do nothing;
    if found then
      perform private.award_xp(player, 10);
    end if;
  end loop;
  return null;
end;
$$;

create trigger daily_duel_on_match_finished
  after update of status on public.matches
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.daily_duel_on_match_finished();

-- ---------------------------------------------------------------------------
-- Racha: días jugados, protectores
-- ---------------------------------------------------------------------------

alter table public.profiles add column streak_freezes integer not null default 0 check (streak_freezes between 0 and 2);

-- Qué días jugó cada uno ('played') o le salvó un protector ('frozen').
create table private.streak_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('played', 'frozen')),
  primary key (user_id, day)
);

-- Los días jugados de las últimas cinco semanas, para que el calendario no empiece vacío.
insert into private.streak_log (user_id, day, kind)
select distinct x.user_id, x.day, 'played'
from (
  select r.user_id, private.game_day(r.finished_at) as day from public.game_runs r where r.status = 'finished' and r.finished_at is not null
  union all
  select m.player_x, private.game_day(m.updated_at) from public.matches m where m.status = 'finished'
  union all
  select m.player_o, private.game_day(m.updated_at) from public.matches m where m.status = 'finished'
  union all
  select w.user_id, private.game_day(w.finished_at) from public.wordle_games w where w.finished_at is not null
) x
where x.day >= private.game_day() - 35
on conflict do nothing;

-- Apunta que el usuario ha jugado hoy. Si jugó ayer, sigue la racha; si se
-- saltó días y tiene protectores para todos, los gasta y también sigue; si no,
-- empieza otra. Cada 7 días de racha gana un protector (como mucho 2).
create or replace function private.touch_streak(player uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  p public.profiles;
  missed integer;
  days integer;
  freezes integer;
begin
  insert into private.streak_log (user_id, day, kind) values (player, today, 'played')
  on conflict (user_id, day) do update set kind = 'played';

  select * into p from public.profiles where id = player for update;
  if p.id is null or p.streak_last_day = today then
    return;
  end if;

  missed := coalesce(today - p.streak_last_day - 1, -1);
  freezes := p.streak_freezes;
  if missed = 0 then
    days := p.streak_days + 1;
  elsif missed > 0 and missed <= freezes then
    days := p.streak_days + 1;
    freezes := freezes - missed;
    insert into private.streak_log (user_id, day, kind)
    select player, d::date, 'frozen' from generate_series(p.streak_last_day + 1, today - 1, interval '1 day') d
    on conflict do nothing;
  else
    days := 1;
  end if;

  if days % 7 = 0 then
    freezes := least(freezes + 1, 2);
  end if;

  update public.profiles
  set streak_days = days,
      streak_best = greatest(streak_best, days),
      streak_last_day = today,
      streak_freezes = freezes
  where id = player;
end;
$$;

-- La racha tal y como se ve hoy: sigue viva si jugó hoy o ayer, o si los
-- protectores cubren los días que faltan (se gastan al volver a jugar).
create function private.streak_alive(p public.profiles, today date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p.streak_last_day is not null and today - p.streak_last_day - 1 <= p.streak_freezes;
$$;

revoke execute on function private.streak_alive(public.profiles, date) from public;

-- ---------------------------------------------------------------------------
-- Resúmenes para la app
-- ---------------------------------------------------------------------------

-- La racha: días, récord, si hoy ya ha jugado, protectores que le quedan,
-- cuántos días está tapando ahora un protector y las dos últimas semanas
-- (día y 'played', 'frozen' o nada).
create function public.get_my_streak()
returns table (
  streak_days integer,
  streak_best integer,
  played_today boolean,
  freezes integer,
  covering integer,
  recent jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
  p public.profiles;
  gap integer;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then
    return;
  end if;
  gap := greatest(coalesce(today - p.streak_last_day - 1, 0), 0);

  return query
  select
    case when private.streak_alive(p, today) then p.streak_days else 0 end,
    p.streak_best,
    coalesce(p.streak_last_day = today, false),
    case when private.streak_alive(p, today) then p.streak_freezes - gap else p.streak_freezes end,
    case when private.streak_alive(p, today) then gap else 0 end,
    (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'kind', coalesce(l.kind,
        -- Días que un protector está tapando ahora (aún no se ha gastado).
        case when private.streak_alive(p, today) and d::date > p.streak_last_day and d::date < today then 'frozen' end)) order by d), '[]'::jsonb)
      from generate_series(today - 13, today, interval '1 day') d
      left join private.streak_log l on l.user_id = p.id and l.day = d::date
    );
end;
$$;

-- Los retos de hoy y cómo van: 'available', 'playing', 'finished' (o
-- 'rejected' / 'abandoned', intento usado). En el Wordle, `score` son los
-- intentos si lo acertó; en el duelo no hay puntuación.
create function public.get_my_dailies()
returns table (slot text, game text, status text, score integer, rank bigint, players bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  with challenge as (
    select s.slot, (select c.game from private.daily_slot(today, s.slot) c) as game, s.n
    from unnest(array['puzzle', 'arcade']) with ordinality s(slot, n)
  ), board as (
    select r.user_id, r.daily_slot, rank() over (partition by r.daily_slot order by private.rank_key(r.game, r.score)) as rank
    from public.game_runs r
    where r.daily = today and r.status = 'finished'
  ), mine as (
    select r.daily_slot, r.status, r.score from public.game_runs r
    where r.user_id = auth.uid() and r.daily = today
  )
  select c.slot, c.game,
    coalesce(mine.status, 'available'),
    case when mine.status = 'finished' then mine.score end,
    (select b.rank from board b where b.daily_slot = c.slot and b.user_id = auth.uid()),
    (select count(*) from board b where b.daily_slot = c.slot)
  from challenge c
  left join mine on mine.daily_slot = c.slot
  union all
  select 'wordle', 'wordle',
    case when w.finished_at is not null then 'finished' when w.user_id is not null then 'playing' else 'available' end,
    case when w.solved then cardinality(w.guesses) end,
    null::bigint, null::bigint
  from (select 1) one
  left join lateral (
    select * from public.wordle_games g where g.user_id = auth.uid() and g.day = today
    order by g.finished_at desc nulls last limit 1
  ) w on true
  union all
  select 'duel', private.daily_duel(today),
    case when exists (select 1 from private.daily_duels d where d.user_id = auth.uid() and d.day = today) then 'finished' else 'available' end,
    null::integer, null::bigint, null::bigint;
end;
$$;

-- El resumen de antes (un solo reto) sigue funcionando con el arcade, para
-- las pestañas que aún tengan la versión anterior de la app.
create or replace function public.get_my_daily()
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
  today_game text := (select c.game from private.daily_slot(today, 'arcade') c);
  tomorrow_game text := (select c.game from private.daily_slot(today + 1, 'arcade') c);
begin
  return query
  with board as (
    select r.user_id, rank() over (order by private.rank_key(r.game, r.score)) as rank
    from public.game_runs r
    where r.daily = today and r.daily_slot = 'arcade' and r.status = 'finished'
  ), mine as (
    select r.status, r.score from public.game_runs r
    where r.user_id = auth.uid() and r.daily = today and r.daily_slot = 'arcade'
  )
  select
    today,
    today_game,
    tomorrow_game,
    coalesce((select mine.status from mine), 'available'),
    (select mine.score from mine where mine.status = 'finished'),
    (select board.rank from board where board.user_id = auth.uid()),
    (select count(*) from board),
    case when private.streak_alive(p, today) then p.streak_days else 0 end,
    p.streak_best,
    coalesce(p.streak_last_day = today, false)
  from public.profiles p
  where p.id = auth.uid();
end;
$$;

create or replace function public.get_daily_info()
returns table (day date, game text, next_game text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
begin
  return query
  select today, (select c.game from private.daily_slot(today, 'arcade') c), (select c.game from private.daily_slot(today + 1, 'arcade') c);
end;
$$;

-- Recordatorio de las 20:00: también a quien aún tiene la racha viva gracias a un protector.
create or replace function private.send_streak_reminders(at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipients jsonb;
  today date := private.game_day(at);
begin
  if extract(hour from at at time zone 'Europe/Madrid') <> 20 then
    return 0;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.id, 'streak_days', p.streak_days)), '[]'::jsonb)
  into recipients
  from public.profiles p
  where p.streak_last_day < today
    and private.streak_alive(p, today)
    and p.streak_days >= 2
    and exists (select 1 from public.push_subscriptions s where s.user_id = p.id);

  if jsonb_array_length(recipients) > 0 then
    perform private.post_push(jsonb_build_object('table', 'streaks', 'type', 'REMINDER', 'records', recipients));
  end if;
  return jsonb_array_length(recipients);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

revoke execute on function
  public.get_daily_challenges(),
  public.start_daily_run(text),
  public.get_daily_leaderboard(text, integer, text),
  public.get_my_streak(),
  public.get_my_dailies()
from public, anon, authenticated;

grant execute on function public.get_daily_challenges(), public.get_daily_leaderboard(text, integer, text) to anon, authenticated;
grant execute on function public.start_daily_run(text), public.get_my_streak(), public.get_my_dailies() to authenticated;
