-- Grupos privados: un equipo de trabajo o una pandilla, cada uno con su
-- ranking (como el de amigos, pero solo con la gente del grupo). Se entra con
-- un enlace de invitación (/grupos/unirse/<código>); quien lo crea es el dueño:
-- puede cambiarle el nombre, echar a alguien o borrarlo.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint groups_name_format check (char_length(name) between 1 and 40 and name = btrim(name)),
  code text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- Si el dueño borra su cuenta, el grupo pasa al miembro más antiguo (o se
-- borra si no queda nadie): sin esto, el on delete cascade se lo llevaría.
create function private.hand_over_groups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hand_over_group(g.id, old.id) from public.groups g where g.owner_id = old.id;
  return old;
end;
$$;

-- Pasa el grupo al miembro más antiguo que no sea `leaving`; sin nadie más, lo borra.
create function private.hand_over_group(target uuid, leaving uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  heir uuid;
begin
  select m.user_id into heir
  from public.group_members m
  where m.group_id = target and m.user_id <> leaving
  order by m.joined_at, m.user_id
  limit 1;
  if heir is null then
    delete from public.groups where id = target;
  else
    update public.groups set owner_id = heir where id = target;
  end if;
end;
$$;

create trigger hand_over_groups
  before delete on public.profiles
  for each row execute function private.hand_over_groups();

revoke execute on function private.hand_over_groups(), private.hand_over_group(uuid, uuid) from public;

create function private.is_group_member(target uuid, member uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = target and m.user_id = member);
$$;

revoke execute on function private.is_group_member(uuid, uuid) from public;
-- Lo usan las políticas de abajo, que se evalúan con el rol del usuario.
grant execute on function private.is_group_member(uuid, uuid) to authenticated;

-- Cada miembro ve sus grupos y quién más está en ellos. Los cambios, solo con
-- las funciones de abajo.
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "Los miembros ven su grupo" on public.groups
  for select to authenticated using ((select private.is_group_member(id)));
create policy "Los miembros ven quién está en su grupo" on public.group_members
  for select to authenticated using ((select private.is_group_member(group_id)));

-- Hasta en cuántos grupos puede estar cada uno y cuánta gente cabe en un grupo.
create function private.group_limits(out max_groups integer, out max_members integer)
language sql
immutable
set search_path = ''
as $$ select 10, 50 $$;

revoke execute on function private.group_limits() from public;

create function private.random_group_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := '';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

revoke execute on function private.random_group_code() from public;

-- Comprueba que se puede entrar en un grupo más.
create function private.check_group_room(member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.group_members m where m.user_id = member) >= (private.group_limits()).max_groups then
    raise exception 'Ya estás en demasiados grupos' using errcode = '54000';
  end if;
end;
$$;

revoke execute on function private.check_group_room(uuid) from public;

create function public.create_group(name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  created uuid;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  perform private.check_group_room(me);
  loop
    begin
      insert into public.groups (name, code, owner_id)
      values (btrim(create_group.name), private.random_group_code(), me)
      returning id into created;
      exit;
    exception when unique_violation then
      -- Código repetido: se prueba con otro.
    end;
  end loop;
  insert into public.group_members (group_id, user_id) values (created, me);
  return created;
end;
$$;

-- Lo que se enseña en la invitación (también sin cuenta).
create function public.get_group_invite(code text)
returns table (id uuid, name text, members integer, joined boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name,
    (select count(*)::integer from public.group_members m where m.group_id = g.id),
    private.is_group_member(g.id)
  from public.groups g
  where g.code = upper(trim(get_group_invite.code));
$$;

-- Entra en el grupo con ese código. Si ya estabas, no hace nada.
create function public.join_group(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  select g.id into target from public.groups g where g.code = upper(trim(join_group.code)) for update;
  if target is null then
    raise exception 'Código no válido' using errcode = 'P0002';
  end if;
  if private.is_group_member(target, me) then
    return target;
  end if;
  perform private.check_group_room(me);
  if (select count(*) from public.group_members m where m.group_id = target) >= (private.group_limits()).max_members then
    raise exception 'El grupo está lleno' using errcode = '54000';
  end if;
  insert into public.group_members (group_id, user_id) values (target, me);
  return target;
end;
$$;

-- Sale del grupo. Si es el dueño, el grupo pasa al miembro más antiguo.
create function public.leave_group(group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if not private.is_group_member(leave_group.group_id, me) then
    raise exception 'No estás en ese grupo' using errcode = 'P0002';
  end if;
  perform 1 from public.groups g where g.id = leave_group.group_id for update;
  if (select g.owner_id from public.groups g where g.id = leave_group.group_id) = me then
    perform private.hand_over_group(leave_group.group_id, me);
  end if;
  delete from public.group_members m where m.group_id = leave_group.group_id and m.user_id = me;
end;
$$;

-- Lo que solo puede hacer el dueño.
create function private.check_group_owner(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.groups g where g.id = target and g.owner_id = auth.uid()) then
    raise exception 'Solo quien lleva el grupo puede hacerlo' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function private.check_group_owner(uuid) from public;

create function public.rename_group(group_id uuid, name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_group_owner(rename_group.group_id);
  update public.groups g set name = btrim(rename_group.name) where g.id = rename_group.group_id;
end;
$$;

create function public.remove_group_member(group_id uuid, user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_group_owner(remove_group_member.group_id);
  if remove_group_member.user_id = auth.uid() then
    raise exception 'Para salir, usa leave_group' using errcode = '22023';
  end if;
  delete from public.group_members m
  where m.group_id = remove_group_member.group_id and m.user_id = remove_group_member.user_id;
end;
$$;

create function public.delete_group(group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_group_owner(delete_group.group_id);
  delete from public.groups g where g.id = delete_group.group_id;
end;
$$;

revoke execute on function
  public.create_group(text), public.get_group_invite(text), public.join_group(text), public.leave_group(uuid),
  public.rename_group(uuid, text), public.remove_group_member(uuid, uuid), public.delete_group(uuid)
  from public, anon, authenticated;
grant execute on function public.get_group_invite(text) to anon, authenticated;
grant execute on function
  public.create_group(text), public.join_group(text), public.leave_group(uuid),
  public.rename_group(uuid, text), public.remove_group_member(uuid, uuid), public.delete_group(uuid)
  to authenticated;

-- Rankings: además de 'global' y 'friends', scope 'group' con group_id (solo
-- para sus miembros). Cambia la firma, así que se borran y se crean de nuevo.

-- Comprueba scope y grupo; da error si no valen para quien pregunta.
create function private.check_board_scope(scope text, group_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if scope not in ('global', 'friends', 'group') then
    raise exception 'scope no válido: %', scope using errcode = '22023';
  elsif scope <> 'global' and auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  elsif scope = 'group' and not private.is_group_member(group_id) then
    raise exception 'No estás en ese grupo' using errcode = '42501';
  end if;
end;
$$;

-- Si alguien entra en el ranking de ese scope (y grupo).
create function private.in_board(scope text, group_id uuid, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when scope = 'group' then private.is_group_member(group_id, member)
    else private.in_scope(scope, member)
  end;
$$;

revoke execute on function private.check_board_scope(text, uuid), private.in_board(text, uuid, uuid) from public;

drop function public.get_leaderboard(text, text, text, integer);
drop function public.get_level_leaderboard(text, integer);
drop function public.get_match_leaderboard(text[], text, text, integer);

create function public.get_leaderboard(game text, scope text default 'global', period text default 'all', max_rows integer default 50, group_id uuid default null)
returns table (rank bigint, user_id uuid, username text, avatar_seed bigint, avatar_parts jsonb, supporter_tier text, score integer, achieved_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_board_scope(scope, get_leaderboard.group_id);
  if period not in ('all', 'week') then
    raise exception 'period no válido: %', period using errcode = '22023';
  end if;

  return query
  with best as (
    select distinct on (r.user_id) r.user_id, r.score, r.finished_at
    from public.game_runs r
    where r.game = get_leaderboard.game
      and r.status = 'finished'
      and (period = 'all' or r.finished_at >= date_trunc('week', now()))
      and private.in_board(scope, get_leaderboard.group_id, r.user_id)
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

create function public.get_level_leaderboard(scope text default 'global', max_rows integer default 50, group_id uuid default null)
returns table (rank bigint, user_id uuid, username text, avatar_seed bigint, avatar_parts jsonb, supporter_tier text, xp integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_board_scope(scope, get_level_leaderboard.group_id);

  return query
  with ranked as (
    select rank() over (order by p.xp desc) as rank, p.*
    from public.profiles p
    where private.in_board(scope, get_level_leaderboard.group_id, p.id)
  )
  select r.rank, r.id, r.username, r.avatar_seed, r.avatar_parts, r.supporter_tier, r.xp
  from ranked r
  where r.rank <= least(greatest(max_rows, 1), 100) or r.id = auth.uid()
  order by r.rank, r.username;
end;
$$;

create function public.get_match_leaderboard(games text[], scope text default 'global', period text default 'all', max_rows integer default 50, group_id uuid default null)
returns table (rank bigint, user_id uuid, username text, avatar_seed bigint, avatar_parts jsonb, supporter_tier text, wins integer, played integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_board_scope(scope, get_match_leaderboard.group_id);
  if period not in ('all', 'week') then
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
    where private.in_board(scope, get_match_leaderboard.group_id, r.player_id)
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
  public.get_leaderboard(text, text, text, integer, uuid),
  public.get_level_leaderboard(text, integer, uuid),
  public.get_match_leaderboard(text[], text, text, integer, uuid)
  from public, anon, authenticated;
grant execute on function
  public.get_leaderboard(text, text, text, integer, uuid),
  public.get_level_leaderboard(text, integer, uuid),
  public.get_match_leaderboard(text[], text, text, integer, uuid)
  to anon, authenticated;
