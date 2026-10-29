-- Valoraciones de los juegos: a la 3.ª partida terminada de cada juego se
-- pregunta qué le parece (como en la encuesta de Órbitas): 3 = me encanta,
-- 2 = está bien, 1 = no me convence, con un comentario opcional. Si dice
-- "Ahora no", se vuelve a preguntar 5 partidas después; si lo vuelve a
-- rechazar, no se pregunta más.
--
-- Una fila por usuario y juego. Sin respuesta (`rating` null) apunta los
-- rechazos: cuántos y con cuántas partidas. Responder después la completa; se
-- puede cambiar la respuesta (cuenta `updated_at`).
--
-- `game` es el id del catálogo (lib/seo.ts: 'lights-out', 'minesweeper'…), no
-- el de game_runs: una valoración por juego, no por dificultad.

create table public.game_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9-]{2,30}$'),
  rating smallint check (rating between 1 and 3),
  comment text check (comment is null or char_length(comment) between 1 and 1500),
  -- Partidas que llevaba al responder (o al rechazar por última vez).
  games_played integer not null default 0 check (games_played between 0 and 1000000),
  dismissals smallint not null default 0 check (dismissals between 0 and 10),
  locale text check (char_length(locale) <= 10),
  app_version text check (char_length(app_version) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_ratings_once unique (user_id, game),
  constraint game_ratings_comment_needs_rating check (rating is not null or comment is null)
);

create index game_ratings_game_idx on public.game_ratings (game, updated_at desc) where rating is not null;
create index game_ratings_recent_idx on public.game_ratings (updated_at desc) where rating is not null;

alter table public.game_ratings enable row level security;
revoke all on public.game_ratings from anon, authenticated;
grant select on public.game_ratings to authenticated;

-- Cada uno ve solo las suyas (para saber si ya ha respondido o rechazado).
create policy "Cada uno ve sus valoraciones"
  on public.game_ratings for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Jugadores
-- ---------------------------------------------------------------------------

-- Responde (o cambia la respuesta).
create function public.rate_game(
  game text,
  rating smallint,
  comment text default null,
  games_played integer default 0,
  locale text default null,
  app_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión' using errcode = '42501';
  end if;
  if (select count(*) from public.game_ratings r
      where r.user_id = me and r.rating is not null and r.updated_at > now() - interval '1 hour') >= 20 then
    raise exception 'Demasiadas valoraciones seguidas' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.game_ratings (user_id, game, rating, comment, games_played, locale, app_version)
  values (
    me,
    rate_game.game,
    rate_game.rating,
    nullif(trim(rate_game.comment), ''),
    greatest(rate_game.games_played, 0),
    left(rate_game.locale, 10),
    left(rate_game.app_version, 40)
  )
  on conflict on constraint game_ratings_once do update
  set rating = excluded.rating,
      comment = excluded.comment,
      games_played = excluded.games_played,
      locale = excluded.locale,
      app_version = excluded.app_version,
      updated_at = now();
end;
$$;

-- "Ahora no": apunta el rechazo. Si ya había respondido, no cambia nada.
create function public.dismiss_game_rating(game text, games_played integer default 0)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión' using errcode = '42501';
  end if;

  insert into public.game_ratings (user_id, game, games_played, dismissals)
  values (me, dismiss_game_rating.game, greatest(dismiss_game_rating.games_played, 0), 1)
  on conflict on constraint game_ratings_once do update
  set dismissals = least(public.game_ratings.dismissals + 1, 10),
      games_played = excluded.games_played,
      updated_at = now()
  where public.game_ratings.rating is null;
end;
$$;

revoke execute on function public.rate_game(text, smallint, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.dismiss_game_rating(text, integer) from public, anon, authenticated;
grant execute on function public.rate_game(text, smallint, text, integer, text, text) to authenticated;
grant execute on function public.dismiss_game_rating(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Panel de admin (solo service_role, como las demás admin_*)
-- ---------------------------------------------------------------------------

-- Resumen por juego (solo los que tienen respuestas). La media va de 1 a 3;
-- la de los últimos 30 días y la de antes sirven para ver si un cambio ha gustado.
create function public.admin_game_ratings_summary()
returns table (
  game text,
  ratings integer,
  average numeric,
  count_1 integer,
  count_2 integer,
  count_3 integer,
  count_7d integer,
  average_30d numeric,
  average_before_30d numeric,
  comments integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.game,
    count(*)::integer,
    round(avg(r.rating), 2),
    (count(*) filter (where r.rating = 1))::integer,
    (count(*) filter (where r.rating = 2))::integer,
    (count(*) filter (where r.rating = 3))::integer,
    (count(*) filter (where r.updated_at > now() - interval '7 days'))::integer,
    round(avg(r.rating) filter (where r.updated_at > now() - interval '30 days'), 2),
    round(avg(r.rating) filter (where r.updated_at <= now() - interval '30 days'), 2),
    (count(*) filter (where r.comment is not null))::integer
  from public.game_ratings r
  where r.rating is not null
  group by r.game
  order by r.game;
$$;

-- Respuestas, de la más reciente a la más antigua, con quién las ha dado
-- (nombre, código de amigo y monstruo; nunca el email). `before` pagina por updated_at.
create function public.admin_list_game_ratings(
  game text default null,
  min_rating smallint default null,
  max_rating smallint default null,
  with_comment boolean default false,
  max integer default 100,
  before timestamptz default null
)
returns table (
  id uuid,
  game text,
  rating smallint,
  comment text,
  games_played integer,
  locale text,
  app_version text,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  username text,
  friend_code text,
  avatar_seed bigint,
  avatar_parts jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.game, r.rating, r.comment, r.games_played, r.locale, r.app_version, r.created_at, r.updated_at,
         r.user_id, p.username, fc.code, p.avatar_seed, p.avatar_parts
  from public.game_ratings r
  join public.profiles p on p.id = r.user_id
  left join public.friend_codes fc on fc.user_id = r.user_id
  where r.rating is not null
    and (admin_list_game_ratings.game is null or r.game = admin_list_game_ratings.game)
    and (admin_list_game_ratings.min_rating is null or r.rating >= admin_list_game_ratings.min_rating)
    and (admin_list_game_ratings.max_rating is null or r.rating <= admin_list_game_ratings.max_rating)
    and (not admin_list_game_ratings.with_comment or r.comment is not null)
    and (admin_list_game_ratings.before is null or r.updated_at < admin_list_game_ratings.before)
  order by r.updated_at desc
  limit least(greatest(coalesce(admin_list_game_ratings.max, 100), 1), 500);
$$;

revoke execute on function public.admin_game_ratings_summary() from public, anon, authenticated;
revoke execute on function public.admin_list_game_ratings(text, smallint, smallint, boolean, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_game_ratings_summary() to service_role;
grant execute on function public.admin_list_game_ratings(text, smallint, smallint, boolean, integer, timestamptz) to service_role;
