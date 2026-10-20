-- Reto diario y rachas.
--
-- Reto diario: la misma partida de 2048 para todos cada día, con un solo
-- intento. La semilla del día se genera al empezar el primer intento y no se
-- revela hasta que cada jugador empieza el suyo. Las partidas del reto son
-- partidas normales (cuentan también para el ranking del 2048 y dan XP) con la
-- columna `daily` puesta.
--
-- Racha: días seguidos jugando. Cuenta terminar una partida de 2048 o una
-- partida contra un amigo. Los días van de medianoche a medianoche en España.

-- ---------------------------------------------------------------------------
-- Día de juego
-- ---------------------------------------------------------------------------

create function private.game_day(at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select (at at time zone 'Europe/Madrid')::date;
$$;

-- ---------------------------------------------------------------------------
-- Reto diario
-- ---------------------------------------------------------------------------

create table private.daily_seeds (
  day date primary key,
  seed bigint not null default private.random_uint32()
);

alter table public.game_runs add column daily date;

-- Un intento por jugador y día.
create unique index game_runs_one_daily_idx on public.game_runs (user_id, daily) where daily is not null;
create index game_runs_daily_board_idx on public.game_runs (daily, score desc) where status = 'finished' and daily is not null;

-- Empieza el intento de hoy. Como en los retos, repetir la llamada en los
-- primeros segundos devuelve la misma partida; después ya no.
create function public.start_daily_run()
returns table (id uuid, seed bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
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
      return query select attempt.id, attempt.seed;
      return;
    end if;
    raise exception 'Ya has jugado el reto de hoy' using errcode = 'P0001', hint = 'already_played';
  end if;

  insert into private.daily_seeds (day) values (today) on conflict do nothing;

  select * into started from private.begin_run('2048', (select s.seed from private.daily_seeds s where s.day = today));
  update public.game_runs r set daily = today where r.id = started.id;

  return query select started.id, started.seed;
end;
$$;

-- Retar con la partida del día daría su semilla a quien aún no ha jugado el reto.
create or replace function public.create_challenge(run_id uuid, friend uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run public.game_runs;
  result uuid;
begin
  select * into run from public.game_runs r
  where r.id = run_id and r.user_id = auth.uid() and r.status = 'finished';

  if run.id is null then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
  if run.daily is not null then
    raise exception 'No se puede retar con la partida del reto diario' using errcode = 'P0001', hint = 'daily_run';
  end if;
  if not private.are_friends(auth.uid(), friend) then
    raise exception 'Solo puedes retar a tus amigos' using errcode = 'P0001', hint = 'not_friends';
  end if;

  insert into public.challenges (game, challenger_id, challenged_id, source_run_id, target_score)
  values (run.game, auth.uid(), friend, run.id, run.score)
  on conflict (source_run_id, challenged_id) do nothing
  returning id into result;

  if result is null then
    select c.id into result from public.challenges c
    where c.source_run_id = run.id and c.challenged_id = friend;
  end if;
  return result;
end;
$$;

-- Ranking del reto de hoy. Mismas columnas que get_leaderboard.
create function public.get_daily_leaderboard(scope text default 'global', max_rows integer default 50)
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
    rank() over (order by r.score desc),
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
  order by r.score desc, r.finished_at
  limit least(greatest(max_rows, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rachas
-- ---------------------------------------------------------------------------

-- Solo las cambia el servidor (no están en el grant de update de profiles).
alter table public.profiles
  add column streak_days integer not null default 0 check (streak_days >= 0),
  add column streak_best integer not null default 0 check (streak_best >= 0),
  add column streak_last_day date;

-- Apunta que el usuario ha jugado hoy: sigue la racha si jugó ayer o empieza otra.
create function private.touch_streak(player uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.game_day();
begin
  update public.profiles p
  set streak_days = s.days,
      streak_best = greatest(p.streak_best, s.days),
      streak_last_day = today
  from (
    select case when p2.streak_last_day = today - 1 then p2.streak_days + 1 else 1 end as days
    from public.profiles p2
    where p2.id = player
  ) s
  where p.id = player and p.streak_last_day is distinct from today;
end;
$$;

create function private.streak_on_run_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.touch_streak(new.user_id);
  return null;
end;
$$;

create trigger streak_on_run_finished
  after update of status on public.game_runs
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.streak_on_run_finished();

create function private.streak_on_match_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.touch_streak(new.player_x);
  perform private.touch_streak(new.player_o);
  return null;
end;
$$;

create trigger streak_on_match_finished
  after update of status on public.matches
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.streak_on_match_finished();

-- ---------------------------------------------------------------------------
-- Resumen para el panel: reto de hoy y racha
-- ---------------------------------------------------------------------------

-- status: available | playing | finished | rejected | abandoned.
-- La racha se muestra a 0 si ya se ha cortado (ni hoy ni ayer).
create function public.get_my_daily()
returns table (
  day date,
  status text,
  score integer,
  rank bigint,
  players bigint,
  streak_days integer,
  streak_best integer,
  played_today boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select private.game_day() as day
  ), board as (
    select r.user_id, rank() over (order by r.score desc) as rank
    from public.game_runs r, today
    where r.daily = today.day and r.status = 'finished'
  ), mine as (
    select r.status, r.score from public.game_runs r, today
    where r.user_id = auth.uid() and r.daily = today.day
  )
  select
    today.day,
    coalesce((select mine.status from mine), 'available'),
    (select mine.score from mine where mine.status = 'finished'),
    (select board.rank from board where board.user_id = auth.uid()),
    (select count(*) from board),
    case when p.streak_last_day >= today.day - 1 then p.streak_days else 0 end,
    p.streak_best,
    coalesce(p.streak_last_day = today.day, false)
  from public.profiles p, today
  where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Aviso de racha a punto de perderse
-- ---------------------------------------------------------------------------

-- Envía un aviso al servidor (mismo canal que notify_push).
create function private.post_push(body jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if url is null or secret is null then
    return;
  end if;

  perform net.http_post(
    url := url,
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', secret),
    body := body,
    timeout_milliseconds := 5000
  );
end;
$$;

-- A las 20:00 en España, a quien lleva al menos 2 días de racha y hoy aún no
-- ha jugado. pg_cron la llama cada hora; devuelve a cuántos se avisa.
create function private.send_streak_reminders(at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipients jsonb;
begin
  if extract(hour from at at time zone 'Europe/Madrid') <> 20 then
    return 0;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.id, 'streak_days', p.streak_days)), '[]'::jsonb)
  into recipients
  from public.profiles p
  where p.streak_last_day = private.game_day(at) - 1
    and p.streak_days >= 2
    and exists (select 1 from public.push_subscriptions s where s.user_id = p.id);

  if jsonb_array_length(recipients) > 0 then
    perform private.post_push(jsonb_build_object('table', 'streaks', 'type', 'REMINDER', 'records', recipients));
  end if;
  return jsonb_array_length(recipients);
end;
$$;

create extension if not exists pg_cron;

select cron.schedule('streak-reminders', '0 * * * *', 'select private.send_streak_reminders()');

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

revoke execute on function
  public.start_daily_run(),
  public.get_daily_leaderboard(text, integer),
  public.get_my_daily()
from public, anon, authenticated;

grant execute on function public.start_daily_run(), public.get_my_daily() to authenticated;
grant execute on function public.get_daily_leaderboard(text, integer) to anon, authenticated;

revoke execute on function
  private.game_day(timestamptz),
  private.touch_streak(uuid),
  private.streak_on_run_finished(),
  private.streak_on_match_finished(),
  private.post_push(jsonb),
  private.send_streak_reminders(timestamptz)
from public;
