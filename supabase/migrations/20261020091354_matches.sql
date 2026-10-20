-- Partidas multijugador por turnos entre amigos (de momento, 3 en raya).
--
-- Una partida es su lista de movimientos. La lógica del juego vive en
-- @repo/games: el servidor de Next valida cada jugada y la guarda con
-- `apply_match_move` (solo service_role), con concurrencia optimista sobre el
-- número de movimientos. El resto del ciclo (retar, aceptar, rendirse) son
-- funciones que puede llamar el propio jugador.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('tictactoe')),
  player_x uuid not null references public.profiles (id) on delete cascade,
  player_o uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'finished', 'declined', 'cancelled')),
  moves smallint[] not null default '{}',
  -- En una partida terminada, winner null significa empate.
  winner text check (winner in ('x', 'o')),
  end_reason text check (end_reason in ('line', 'draw', 'resign')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_two_players check (player_x <> player_o),
  constraint matches_creator_plays check (created_by in (player_x, player_o)),
  constraint matches_finished_has_reason check ((status = 'finished') = (end_reason is not null))
);

create index matches_player_x_idx on public.matches (player_x, updated_at desc);
create index matches_player_o_idx on public.matches (player_o, updated_at desc);

-- Como mucho una partida abierta por pareja y juego: evita llenar de retos a alguien.
create unique index matches_one_open_per_pair
  on public.matches (game, least(player_x, player_o), greatest(player_x, player_o))
  where status in ('pending', 'active');

alter table public.matches enable row level security;

create policy "Cada jugador ve sus partidas"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) in (player_x, player_o));

revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;

-- Realtime: los cambios llegan solo a quien puede verlos según la política de arriba.
alter publication supabase_realtime add table public.matches;

-- ---------------------------------------------------------------------------

create function private.award_xp(user_id uuid, amount integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set xp = xp + amount where id = user_id;
$$;

-- Reta a un amigo. Si ya hay una partida abierta entre los dos, devuelve esa.
create function public.create_match(game text, opponent uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing uuid;
  me_first boolean := get_byte(extensions.gen_random_bytes(1), 0) % 2 = 0;
  new_id uuid;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  if not private.are_friends(me, opponent) then
    raise exception 'Solo puedes retar a tus amigos' using errcode = 'P0001', hint = 'not_friends';
  end if;

  -- Serializa por pareja para que dos retos simultáneos no choquen con el índice único.
  perform pg_advisory_xact_lock(hashtextextended(
    'match:' || create_match.game || least(me, opponent)::text || greatest(me, opponent)::text, 0));

  select m.id into existing
  from public.matches m
  where m.game = create_match.game
    and m.status in ('pending', 'active')
    and least(m.player_x, m.player_o) = least(me, opponent)
    and greatest(m.player_x, m.player_o) = greatest(me, opponent);

  if existing is not null then
    return existing;
  end if;

  insert into public.matches (game, player_x, player_o, created_by)
  values (
    create_match.game,
    case when me_first then me else opponent end,
    case when me_first then opponent else me end,
    me
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- El retado acepta o rechaza.
create function public.respond_match(match_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
  set status = case when accept then 'active' else 'declined' end, updated_at = now()
  where id = match_id
    and status = 'pending'
    and created_by <> auth.uid()
    and auth.uid() in (player_x, player_o);

  if not found then
    raise exception 'Reto no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

-- Quien retó lo retira mientras no lo hayan aceptado.
create function public.cancel_match(match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
  set status = 'cancelled', updated_at = now()
  where id = match_id and status = 'pending' and created_by = auth.uid();

  if not found then
    raise exception 'Reto no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

-- Rendirse da la victoria al otro, pero no da XP (para que no se pueda regalar).
create function public.resign_match(match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
  set status = 'finished',
      end_reason = 'resign',
      winner = case when player_x = auth.uid() then 'o' else 'x' end,
      updated_at = now()
  where id = match_id and status = 'active' and auth.uid() in (player_x, player_o);

  if not found then
    raise exception 'Partida no encontrada' using errcode = 'P0002';
  end if;
end;
$$;

-- Guarda una jugada ya validada por el servidor. `previous_count` es el número
-- de movimientos que había cuando se validó: si ha cambiado, otra petición se
-- adelantó y esta se descarta.
create function public.apply_match_move(
  match_id uuid,
  previous_count integer,
  moves smallint[],
  end_reason text default null,
  winner text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  update public.matches
  set moves = apply_match_move.moves,
      status = case when apply_match_move.end_reason is null then 'active' else 'finished' end,
      end_reason = apply_match_move.end_reason,
      winner = apply_match_move.winner,
      updated_at = now()
  where id = match_id
    and status = 'active'
    and cardinality(matches.moves) = previous_count
  returning * into m;

  if m.id is null then
    raise exception 'La partida ha cambiado' using errcode = 'P0002';
  end if;

  -- Tope de XP: solo las primeras partidas del día entre la misma pareja
  -- cuentan, para que dos amigos no puedan farmear empates.
  if (
    select count(*) from public.matches x
    where x.game = m.game
      and least(x.player_x, x.player_o) = least(m.player_x, m.player_o)
      and greatest(x.player_x, x.player_o) = greatest(m.player_x, m.player_o)
      and x.status = 'finished'
      and x.end_reason in ('line', 'draw')
      and x.updated_at > now() - interval '1 day'
  ) > 5 then
    return;
  end if;

  if m.end_reason = 'line' then
    perform private.award_xp(case when m.winner = 'x' then m.player_x else m.player_o end, 10);
    perform private.award_xp(case when m.winner = 'x' then m.player_o else m.player_x end, 2);
  elsif m.end_reason = 'draw' then
    perform private.award_xp(m.player_x, 4);
    perform private.award_xp(m.player_o, 4);
  end if;
end;
$$;

revoke execute on function
  public.create_match(text, uuid),
  public.respond_match(uuid, boolean),
  public.cancel_match(uuid),
  public.resign_match(uuid),
  public.apply_match_move(uuid, integer, smallint[], text, text)
from public, anon, authenticated;

grant execute on function
  public.create_match(text, uuid),
  public.respond_match(uuid, boolean),
  public.cancel_match(uuid),
  public.resign_match(uuid)
to authenticated;

grant execute on function public.apply_match_move(uuid, integer, smallint[], text, text) to service_role;
