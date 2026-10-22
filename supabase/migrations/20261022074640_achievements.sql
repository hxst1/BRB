-- Logros: objetivos que, al cumplirse, desbloquean ropa para el monstruo.
--
-- Las condiciones viven solo aquí (private.achievement_progress) y se
-- comprueban con disparadores al terminar partidas, al aceptar amistades y al
-- subir la racha, así que nadie puede darse un logro desde el cliente.
-- Los nombres y textos están en apps/web/src/lib/achievements.ts, y qué parte
-- da cada logro en packages/avatars (`achievement`); un test comprueba que los
-- tres sitios coinciden.

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement)
);

alter table public.user_achievements enable row level security;
revoke all on public.user_achievements from anon, authenticated;
grant select on public.user_achievements to authenticated;

create policy "Cada usuario ve sus logros"
  on public.user_achievements for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Para el aviso de "logro desbloqueado" en directo.
alter publication supabase_realtime add table public.user_achievements;

-- ---------------------------------------------------------------------------
-- Condiciones
-- ---------------------------------------------------------------------------

-- Progreso de cada logro: cuánto lleva y cuánto necesita.
create function private.achievement_progress(player uuid)
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
  )::integer, 5;
$$;

-- Da los logros cumplidos que aún no tenga.
create function private.grant_achievements(player uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_achievements (user_id, achievement)
  select player, a.achievement
  from private.achievement_progress(player) a
  where a.progress >= a.goal
  on conflict do nothing;
$$;

-- ---------------------------------------------------------------------------
-- Cuándo se comprueban
-- ---------------------------------------------------------------------------

create function private.achievements_on_run_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.user_id);
  return null;
end;
$$;

create trigger achievements_on_run_finished
  after update of status on public.game_runs
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.achievements_on_run_finished();

create function private.achievements_on_match_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.player_x);
  perform private.grant_achievements(new.player_o);
  return null;
end;
$$;

create trigger achievements_on_match_finished
  after update of status on public.matches
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.achievements_on_match_finished();

create function private.achievements_on_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.requester_id);
  perform private.grant_achievements(new.addressee_id);
  return null;
end;
$$;

create trigger achievements_on_friendship
  after insert or update of status on public.friendships
  for each row
  when (new.status = 'accepted')
  execute function private.achievements_on_friendship();

create function private.achievements_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.id);
  return null;
end;
$$;

-- La racha se sube en otro disparador de game_runs: se mira aquí, al cambiar.
create trigger achievements_on_streak
  after update of streak_best on public.profiles
  for each row
  when (new.streak_best is distinct from old.streak_best)
  execute function private.achievements_on_profile();

create function private.achievements_on_wordle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.user_id);
  return null;
end;
$$;

create trigger achievements_on_wordle
  after insert or update of solved on public.wordle_games
  for each row
  when (new.solved)
  execute function private.achievements_on_wordle();

-- ---------------------------------------------------------------------------
-- Ropa bloqueada por logro
-- ---------------------------------------------------------------------------

-- Logro que pide cada parte del avatar (null si es libre).
-- Debe coincidir con las partes `achievement` de packages/avatars.
create function private.part_achievement(slot text, id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when slot = 'palette' and id = 'ember' then 'streak-30'
    when slot = 'palette' and id = 'ultra' then 'tile-2048'
    when slot = 'palette' and id = 'ice' then 'minesweeper-hard'
    when slot = 'palette' and id = 'jungle' then 'snake-30'
    when slot = 'top' and id = 'cap' then 'first-run'
    when slot = 'top' and id = 'headphones' then 'friends-3'
    when slot = 'top' and id = 'flower' then 'streak-7'
    when slot = 'top' and id = 'bow' then 'wordle-3'
    when slot = 'top' and id = 'halo' then 'lightsout-10'
    when slot = 'top' and id = 'wizard' then 'sudoku-hard'
    when slot = 'top' and id = 'party' then 'winner-5'
  end;
$$;

-- El cliente escribe avatar_parts directamente (RLS): la regla vive aquí.
-- security definer: se dispara con el rol del usuario, sin acceso a private.
create function private.check_achievement_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot text;
  needed text;
begin
  foreach slot in array array['palette', 'top'] loop
    needed := private.part_achievement(slot, new.avatar_parts ->> slot);
    if needed is not null and not exists (
      select 1 from public.user_achievements a where a.user_id = new.id and a.achievement = needed
    ) then
      raise exception 'Esa parte del avatar se desbloquea con un logro'
        using errcode = 'P0001', hint = 'achievement_only';
    end if;
  end loop;
  return new;
end;
$$;

create trigger check_achievement_avatar
  before insert or update of avatar_parts on public.profiles
  for each row execute function private.check_achievement_avatar();

-- ---------------------------------------------------------------------------
-- Lectura
-- ---------------------------------------------------------------------------

create function public.get_my_achievements()
returns table (achievement text, progress integer, goal integer, unlocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.achievement, least(a.progress, a.goal), a.goal, u.unlocked_at
  from private.achievement_progress(auth.uid()) a
  left join public.user_achievements u on u.user_id = auth.uid() and u.achievement = a.achievement
  where auth.uid() is not null;
$$;

revoke execute on function
  private.achievement_progress(uuid),
  private.grant_achievements(uuid),
  private.achievements_on_run_finished(),
  private.achievements_on_match_finished(),
  private.achievements_on_friendship(),
  private.achievements_on_profile(),
  private.achievements_on_wordle(),
  private.part_achievement(text, text),
  private.check_achievement_avatar()
from public;

revoke execute on function public.get_my_achievements() from public, anon, authenticated;
grant execute on function public.get_my_achievements() to authenticated;

-- Lo ya conseguido antes de existir los logros también cuenta.
select private.grant_achievements(p.id) from public.profiles p;
