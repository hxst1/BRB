-- Rankings de la página /ranking: nivel (XP) y victorias en los juegos contra
-- amigos. El del 2048 ya existe (get_leaderboard / get_my_standing).
--
-- Todas devuelven el top y, si el usuario no está en él, también su fila, para
-- que siempre pueda ver en qué puesto va. scope: 'global' | 'friends'.

create function private.in_scope(scope text, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select scope = 'global' or user_id = auth.uid() or private.are_friends(auth.uid(), user_id);
$$;

create function public.get_level_leaderboard(scope text default 'global', max_rows integer default 50)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_seed bigint,
  avatar_parts jsonb,
  supporter_tier text,
  xp integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if scope not in ('global', 'friends') then
    raise exception 'scope no válido: %', scope using errcode = '22023';
  end if;

  return query
  with ranked as (
    select rank() over (order by p.xp desc) as rank, p.*
    from public.profiles p
    where private.in_scope(scope, p.id)
  )
  select r.rank, r.id, r.username, r.avatar_seed, r.avatar_parts, r.supporter_tier, r.xp
  from ranked r
  where r.rank <= least(greatest(max_rows, 1), 100) or r.id = auth.uid()
  order by r.rank, r.username;
end;
$$;

-- Victorias en partidas contra amigos. `games` permite juntar variantes
-- (piedra, papel o tijera clásico y con lagarto y Spock). Ordena por
-- victorias y, a igualdad, por porcentaje de victorias.
create function public.get_match_leaderboard(
  games text[],
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
  wins integer,
  played integer
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
  end if;

  return query
  with results as (
    select player.id as player_id, m.winner = player.mark as won
    from public.matches m
    cross join lateral (values (m.player_x, 'x'), (m.player_o, 'o')) as player (id, mark)
    where m.game = any (games)
      and m.status = 'finished'
      and (period = 'all' or m.updated_at >= date_trunc('week', now()))
  ),
  totals as (
    select r.player_id, count(*) filter (where r.won)::integer as wins, count(*)::integer as played
    from results r
    where private.in_scope(scope, r.player_id)
    group by r.player_id
  ),
  ranked as (
    select rank() over (order by t.wins desc, t.wins::numeric / t.played desc) as rank, t.*
    from totals t
  )
  select r.rank, p.id, p.username, p.avatar_seed, p.avatar_parts, p.supporter_tier, r.wins, r.played
  from ranked r
  join public.profiles p on p.id = r.player_id
  where r.rank <= least(greatest(max_rows, 1), 100) or r.player_id = auth.uid()
  order by r.rank, p.username;
end;
$$;

revoke execute on function
  public.get_level_leaderboard(text, integer),
  public.get_match_leaderboard(text[], text, text, integer)
from public, anon, authenticated;

grant execute on function
  public.get_level_leaderboard(text, integer),
  public.get_match_leaderboard(text[], text, text, integer)
to anon, authenticated;
