-- Invitar amigos: enlace /invita/<código de amigo>.
--
-- Quien se registra tras entrar por el enlace de alguien queda apuntado como
-- invitado suyo (raw_user_meta_data.invited_by, lo pone el registro) y pasan
-- a ser amigos. Con 5 invitados que hayan jugado al menos una partida, quien
-- invitó gana el logro «Embajador» (color neón).

create table private.referrals (
  referred_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index referrals_referrer_idx on private.referrals (referrer_id);

-- Tras crear el perfil (on_auth_user_created va antes: los disparadores van por orden alfabético).
create function private.handle_invited_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter uuid;
begin
  select c.user_id into inviter
  from public.friend_codes c
  where c.code = upper(trim(new.raw_user_meta_data ->> 'invited_by'));
  if inviter is null or inviter = new.id then
    return null;
  end if;

  insert into private.referrals (referred_id, referrer_id) values (new.id, inviter) on conflict do nothing;
  insert into public.friendships (requester_id, addressee_id, status, accepted_at)
  values (inviter, new.id, 'accepted', now())
  on conflict do nothing;
  return null;
end;
$$;

create trigger on_auth_user_invited
  after insert on auth.users
  for each row
  when (new.raw_user_meta_data ? 'invited_by')
  execute function private.handle_invited_user();

revoke execute on function private.handle_invited_user() from public;

-- Cuántos amigos has invitado y cuántos cuentan ya (han jugado). Para enseñar el progreso.
create function public.get_my_referrals()
returns table (invited integer, active integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer,
         count(*) filter (
           where exists (select 1 from public.game_runs g where g.user_id = r.referred_id and g.status = 'finished')
              or exists (select 1 from public.matches m where m.status = 'finished' and r.referred_id in (m.player_x, m.player_o))
         )::integer
  from private.referrals r
  where r.referrer_id = auth.uid();
$$;

revoke execute on function public.get_my_referrals() from public, anon, authenticated;
grant execute on function public.get_my_referrals() to authenticated;

-- Logros: el de invitar amigos, el color que da y, al jugar un invitado, comprobar el de quien le invitó.
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
  )::integer, 5;
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
  end;
$$;

create or replace function private.achievements_on_run_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.user_id);
  -- Quien le invitó puede haber completado su logro de invitar amigos.
  perform private.grant_achievements(r.referrer_id) from private.referrals r where r.referred_id = new.user_id;
  return null;
end;
$$;

create or replace function private.achievements_on_match_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_achievements(new.player_x);
  perform private.grant_achievements(new.player_o);
  perform private.grant_achievements(r.referrer_id) from private.referrals r where r.referred_id in (new.player_x, new.player_o);
  return null;
end;
$$;
