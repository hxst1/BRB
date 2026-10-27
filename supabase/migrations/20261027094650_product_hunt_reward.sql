-- Logro «Desde Product Hunt»: para quien llega a la app desde Product Hunt
-- durante su lanzamiento. Da un gorro exclusivo (la parte 'launch' del monster).
--
-- No se premia votar: las normas de Product Hunt lo prohíben. Se premia
-- llegar desde allí: la app ve el enlace (?ref=producthunt, que Product Hunt
-- añade a la web de cada producto) o que la visita viene de producthunt.com, y
-- con la sesión iniciada lo reclama con claim_launch_reward. No se puede
-- comprobar del todo (cualquiera puede abrir ese enlace), pero solo se puede
-- conseguir durante la semana del lanzamiento: después queda para quien lo tiene.

create table private.launch_rewards (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- De dónde llegó (de momento, solo 'producthunt').
  source text not null check (source in ('producthunt')),
  claimed_at timestamptz not null default now()
);

comment on table private.launch_rewards is 'Quién ha reclamado el premio por llegar desde un lanzamiento (Product Hunt).';

-- Hasta cuándo se puede reclamar: una semana después del lanzamiento (el 28 de octubre).
create function private.launch_reward_open(at timestamptz default now())
returns boolean
language sql
immutable
set search_path = ''
as $$
  select at < timestamptz '2026-11-05 00:00 Europe/Madrid';
$$;

revoke execute on function private.launch_reward_open(timestamptz) from public;

-- Reclama el premio. Devuelve true si es nuevo; false si ya lo tenía o ya no se puede.
create function public.claim_launch_reward(source text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  if claim_launch_reward.source <> 'producthunt' or not private.launch_reward_open() then
    return false;
  end if;

  insert into private.launch_rewards (user_id, source)
  values (auth.uid(), claim_launch_reward.source)
  on conflict do nothing;
  if not found then
    return false;
  end if;

  perform private.grant_achievements(auth.uid());
  return true;
end;
$$;

revoke execute on function public.claim_launch_reward(text) from public, anon, authenticated;
grant execute on function public.claim_launch_reward(text) to authenticated;

-- Para el panel de administración (solo service_role, como las demás admin_*):
-- cuántos lo han reclamado y cuándo.
create function public.admin_launch_rewards()
returns table (source text, claims bigint, first_claim timestamptz, last_claim timestamptz, new_accounts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.source, count(*), min(l.claimed_at), max(l.claimed_at),
    -- Cuentas creadas a partir del día antes del lanzamiento: lo más probable es que vinieran por él.
    count(*) filter (where p.created_at >= timestamptz '2026-10-27 00:00 Europe/Madrid')
  from private.launch_rewards l
  join public.profiles p on p.id = l.user_id
  group by l.source;
$$;

revoke execute on function public.admin_launch_rewards() from public, anon, authenticated;
grant execute on function public.admin_launch_rewards() to service_role;

-- ---------------------------------------------------------------------------
-- El logro y su gorro (añadidos a las definiciones de antes)
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
  )::integer, 10
  union all
  -- Llegar desde Product Hunt durante su lanzamiento (ver claim_launch_reward).
  select 'product-hunt', least((select count(*) from private.launch_rewards l where l.user_id = player), 1)::integer, 1;
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
    when slot = 'palette' and id = 'neon' then 'referrals-5'
    when slot = 'top' and id = 'cap' then 'first-run'
    when slot = 'top' and id = 'headphones' then 'friends-3'
    when slot = 'top' and id = 'flower' then 'streak-7'
    when slot = 'top' and id = 'bow' then 'wordle-3'
    when slot = 'top' and id = 'halo' then 'lightsout-10'
    when slot = 'top' and id = 'wizard' then 'sudoku-hard'
    when slot = 'top' and id = 'party' then 'winner-5'
    when slot = 'top' and id = 'launch' then 'product-hunt'
  end;
$$;
