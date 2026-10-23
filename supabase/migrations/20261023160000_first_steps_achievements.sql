-- Logros nuevos, que dan colores de la app (tintes) en vez de ropa: así no
-- todos los colores son para quien apoya el proyecto.
--
--   first-steps  Primeros pasos: personalizar el monster, añadir un amigo y
--                jugar el reto diario (los de la tarjeta de la portada).
--   explorer     Jugar a los 6 juegos en solitario.
--   matches-10   Terminar 10 partidas contra amigos.
--
-- Los tintes son del navegador (localStorage); qué logro pide cada uno está
-- en apps/web/src/lib/theme.ts, y su test comprueba que coincide con esto.

-- ---------------------------------------------------------------------------
-- Primeros pasos: una sola regla para la portada y para el logro
-- ---------------------------------------------------------------------------

create function private.first_steps(player uuid)
returns table (monster boolean, friend boolean, daily boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- Ha elegido algo en el editor (sin cambios, todo sale de la semilla).
    coalesce((select p.avatar_parts <> '{}'::jsonb from public.profiles p where p.id = player), false),
    -- Un amigo, o al menos una solicitud enviada: lo que depende de él ya está hecho.
    exists (
      select 1 from public.friendships f
      where f.requester_id = player or (f.status = 'accepted' and f.addressee_id = player)
    ),
    -- Empezar el reto diario ya gasta el intento del día.
    exists (select 1 from public.game_runs r where r.user_id = player and r.daily is not null);
$$;

create function public.get_my_first_steps()
returns table (monster boolean, friend boolean, daily boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.monster, s.friend, s.daily
  from private.first_steps(auth.uid()) s
  where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- Condiciones (las de antes y las tres nuevas)
-- ---------------------------------------------------------------------------

create or replace function private.achievement_progress(player uuid)
returns table (achievement text, progress integer, goal integer)
language sql
stable
security definer
set search_path = ''
as $$
  with runs as (
    select r.game, r.score, r.max_tile
    from public.game_runs r
    where r.user_id = player and r.status = 'finished'
  )
  select 'first-run', least((select count(*) from runs), 1)::integer, 1
  union all
  select 'friends-3', (
    select count(*) from public.friendships f
    where f.status = 'accepted' and player in (f.requester_id, f.addressee_id)
  )::integer, 3
  union all
  select 'streak-7', coalesce((select p.streak_best from public.profiles p where p.id = player), 0), 7
  union all
  select 'streak-30', coalesce((select p.streak_best from public.profiles p where p.id = player), 0), 30
  union all
  select 'tile-2048', coalesce((select max(runs.max_tile) from runs where runs.game = '2048'), 0), 2048
  union all
  -- La puntuación del Snake son 10 puntos por manzana.
  select 'snake-30', coalesce((select max(runs.score) / 10 from runs where runs.game = 'snake'), 0), 30
  union all
  select 'lightsout-10', coalesce((select max(runs.score) from runs where runs.game = 'lightsout'), 0), 10
  union all
  select 'minesweeper-hard', least((select count(*) from runs where runs.game = 'minesweeper-hard'), 1)::integer, 1
  union all
  select 'sudoku-hard', least((select count(*) from runs where runs.game = 'sudoku-hard'), 1)::integer, 1
  union all
  select 'wordle-3', (
    select count(*) from public.wordle_games w
    where w.user_id = player and w.solved and cardinality(w.guesses) <= 3
  )::integer, 1
  union all
  -- Ganar a 5 personas distintas, a cualquier juego contra amigos.
  select 'winner-5', (
    select count(distinct case when m.winner = 'x' then m.player_o else m.player_x end)
    from public.matches m
    where m.status = 'finished'
      and ((m.winner = 'x' and m.player_x = player) or (m.winner = 'o' and m.player_o = player))
  )::integer, 5
  union all
  -- Una issue o un pull request aceptado en el repo de GitHub, con su código de amigo.
  select 'contributor', least((select count(*) from private.github_contributions c where c.user_id = player), 1)::integer, 1
  union all
  -- Amigos invitados con su enlace que se han registrado y han jugado al menos una partida.
  select 'referrals-5', (
    select count(*) from private.referrals r
    where r.referrer_id = player
      and (exists (select 1 from public.game_runs g where g.user_id = r.referred_id and g.status = 'finished')
           or exists (select 1 from public.matches m where m.status = 'finished' and r.referred_id in (m.player_x, m.player_o)))
  )::integer, 5
  union all
  select 'first-steps', (select s.monster::integer + s.friend::integer + s.daily::integer from private.first_steps(player) s), 3
  union all
  -- Cada juego en solitario cuenta una vez, sea cual sea la dificultad; el Wordle, con terminarlo.
  select 'explorer', (
    (select count(distinct split_part(runs.game, '-', 1)) from runs)
    + (select least(count(*), 1) from public.wordle_games w where w.user_id = player and w.finished_at is not null)
  )::integer, 6
  union all
  -- Partidas jugadas hasta el final (no cuentan las abandonadas ni las anuladas).
  select 'matches-10', (
    select count(*) from public.matches m
    where m.status = 'finished'
      and player in (m.player_x, m.player_o)
      and m.end_reason in ('line', 'rounds', 'points', 'fleet', 'checkmate', 'draw')
  )::integer, 10;
$$;

-- ---------------------------------------------------------------------------
-- Cuándo se comprueban (además de los disparadores que ya había)
-- ---------------------------------------------------------------------------

-- Monster: al guardar el editor.
create trigger achievements_on_avatar
  after update of avatar_parts on public.profiles
  for each row
  when (new.avatar_parts is distinct from old.avatar_parts)
  execute function private.achievements_on_profile();

-- Amigo: ya al enviar la solicitud (el de antes solo mira las aceptadas).
create trigger achievements_on_friend_request
  after insert on public.friendships
  for each row
  when (new.status = 'pending')
  execute function private.achievements_on_friendship();

-- Reto diario: al empezarlo (el de antes mira las partidas al terminar).
create trigger achievements_on_daily_started
  after insert on public.game_runs
  for each row
  when (new.daily is not null)
  execute function private.achievements_on_run_finished();

-- Wordle terminado, aunque no se acierte (el de antes solo mira los acertados).
create trigger achievements_on_wordle_finished
  after insert or update of finished_at on public.wordle_games
  for each row
  when (new.finished_at is not null)
  execute function private.achievements_on_wordle();

revoke execute on function private.first_steps(uuid) from public;
revoke execute on function public.get_my_first_steps() from public, anon, authenticated;
grant execute on function public.get_my_first_steps() to authenticated;

-- Quien ya los cumplía los recibe ahora.
do $$
begin
  perform private.grant_achievements(p.id) from public.profiles p;
end;
$$;
