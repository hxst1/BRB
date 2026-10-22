-- Buscaminas: tres juegos en solitario (uno por dificultad, cada uno con su
-- ranking). La puntuación es el tiempo en milisegundos que mide el servidor,
-- así que en estos rankings gana el MENOR. `max_tile` guarda las casillas
-- abiertas a mano.

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check
  check (game in ('2048', 'snake', 'lightsout', 'minesweeper-easy', 'minesweeper-medium', 'minesweeper-hard'));

comment on column public.game_runs.max_tile is
  'Dato secundario de la partida: ficha más alta en 2048, longitud final en Snake, pulsaciones en Lights Out, casillas abiertas en el buscaminas.';

-- Juegos en los que la puntuación es un tiempo: gana el menor.
create function private.lower_is_better(game text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select game like 'minesweeper-%';
$$;

-- Clave para ordenar de mejor a peor (ascendente) sea cual sea el juego.
create function private.rank_key(game text, score integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when private.lower_is_better(game) then score::bigint else -score::bigint end;
$$;

-- ---------------------------------------------------------------------------
-- Rankings
-- ---------------------------------------------------------------------------

create or replace function public.get_leaderboard(
  game text,
  scope text default 'global',
  period text default 'all',
  max_rows integer default 50
)
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
  elsif period not in ('all', 'week') then
    raise exception 'period no válido: %', period using errcode = '22023';
  elsif scope = 'friends' and auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  return query
  with best as (
    select distinct on (r.user_id) r.user_id, r.score, r.finished_at
    from public.game_runs r
    where r.game = get_leaderboard.game
      and r.status = 'finished'
      and (period = 'all' or r.finished_at >= date_trunc('week', now()))
      and (
        scope = 'global'
        or r.user_id = auth.uid()
        or private.are_friends(auth.uid(), r.user_id)
      )
    order by r.user_id, private.rank_key(get_leaderboard.game, r.score), r.finished_at
  )
  select
    rank() over (order by private.rank_key(get_leaderboard.game, b.score)),
    p.id,
    p.username,
    p.avatar_seed,
    p.avatar_parts,
    p.supporter_tier,
    b.score,
    b.finished_at
  from best b
  join public.profiles p on p.id = b.user_id
  order by private.rank_key(get_leaderboard.game, b.score), b.finished_at
  limit least(greatest(max_rows, 1), 100);
end;
$$;

create or replace function public.get_my_standing(game text)
returns table (best_score integer, global_rank integer, global_players integer, friends_rank integer, friends_players integer)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select r.user_id,
           case when private.lower_is_better(get_my_standing.game) then min(r.score) else max(r.score) end as score
    from public.game_runs r
    where r.game = get_my_standing.game and r.status = 'finished'
    group by r.user_id
  ),
  mine as (
    select score from best where user_id = auth.uid()
  ),
  circle as (
    select b.* from best b
    where b.user_id = auth.uid() or private.are_friends(auth.uid(), b.user_id)
  )
  select
    (select score from mine),
    (select count(*)::integer + 1 from best
     where private.rank_key(get_my_standing.game, score) < private.rank_key(get_my_standing.game, (select score from mine))),
    (select count(*)::integer from best),
    (select count(*)::integer + 1 from circle
     where private.rank_key(get_my_standing.game, score) < private.rank_key(get_my_standing.game, (select score from mine))),
    (select count(*)::integer from circle);
$$;

-- ---------------------------------------------------------------------------
-- XP
-- ---------------------------------------------------------------------------

-- XP de una partida en solitario. En el buscaminas, por dificultad (la
-- puntuación es un tiempo); en el resto, según la puntuación.
create function private.xp_for_run(game text, score integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case game
    when 'minesweeper-easy' then 3
    when 'minesweeper-medium' then 8
    when 'minesweeper-hard' then 20
    else private.xp_for_score(score)
  end;
$$;

create or replace function public.finish_run(run_id uuid, moves text, score integer, max_tile integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  run_game text;
begin
  update public.game_runs
  set status = 'finished',
      moves = finish_run.moves,
      score = finish_run.score,
      max_tile = finish_run.max_tile,
      finished_at = now()
  where id = run_id and status = 'playing'
  returning user_id, game into owner, run_game;

  if owner is null then
    raise exception 'Partida no encontrada o ya cerrada' using errcode = 'P0002';
  end if;

  update public.profiles
  set xp = xp + private.xp_for_run(run_game, finish_run.score)
  where id = owner;
end;
$$;
