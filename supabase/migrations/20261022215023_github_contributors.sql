-- Logro «Colaborador»: para quien ayuda con el código en GitHub.
--
-- Una issue abierta o un pull request aceptado en el repo, con el código de
-- amigo escrito en el título o la descripción, da el logro (y el color
-- «terminal»). Lo registra el webhook de GitHub (apps/web/src/app/api/webhooks/github).

create table private.github_contributions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('issue', 'pull_request')),
  github_login text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (kind, url, user_id)
);

-- Registra una colaboración (solo el servidor) y da los logros que toquen.
-- Devuelve false si ya estaba registrada.
create function public.record_github_contribution(user_id uuid, kind text, github_login text, url text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.github_contributions (user_id, kind, github_login, url)
  values (record_github_contribution.user_id, record_github_contribution.kind,
          left(record_github_contribution.github_login, 100), left(record_github_contribution.url, 300))
  on conflict do nothing;
  if not found then
    return false;
  end if;
  perform private.grant_achievements(record_github_contribution.user_id);
  return true;
end;
$$;

revoke execute on function public.record_github_contribution(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_github_contribution(uuid, text, text, text) to service_role;

-- El logro en el progreso y el color que desbloquea (añadidos a las definiciones de 20261022074640_achievements).
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
  select 'contributor', least((select count(*) from private.github_contributions c where c.user_id = player), 1)::integer, 1;
$$;

create or replace function private.part_achievement(slot text, id text)
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
    when slot = 'palette' and id = 'terminal' then 'contributor'
    when slot = 'top' and id = 'cap' then 'first-run'
    when slot = 'top' and id = 'headphones' then 'friends-3'
    when slot = 'top' and id = 'flower' then 'streak-7'
    when slot = 'top' and id = 'bow' then 'wordle-3'
    when slot = 'top' and id = 'halo' then 'lightsout-10'
    when slot = 'top' and id = 'wizard' then 'sudoku-hard'
    when slot = 'top' and id = 'party' then 'winner-5'
  end;
$$;
