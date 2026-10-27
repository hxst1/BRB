-- Jugar como invitado desde un enlace de invitación (/invita/<código>).
--
-- Quien abre el enlace sin cuenta puede jugar al momento: la app crea un
-- usuario anónimo de Supabase con invited_by en los metadatos (el trigger de
-- referrals ya lo hace amigo de quien invitó) y empieza una partida contra él
-- con challenge_inviter. Después puede guardar la cuenta con su email y
-- contraseña: es el mismo usuario, así que no pierde nada. Las cuentas de
-- invitado que nadie guarda se borran a los 30 días sin usarse.

-- Quién invita: nombre y monster, para enseñarlo en la invitación (también sin cuenta).
create function public.get_invite(code text)
returns table (username text, avatar_seed bigint, avatar_parts jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.avatar_seed, p.avatar_parts
  from public.friend_codes f
  join public.profiles p on p.id = f.user_id
  where f.code = upper(trim(get_invite.code));
$$;

-- Reta a quien tiene ese código. Si quien reta entró con el enlace de esa
-- persona (es su invitado), la partida empieza ya, sin esperar a que la
-- acepte, y el invitado mueve primero: así juega al momento. Si no, es un
-- reto normal (create_match: tienen que ser amigos y el otro lo acepta).
-- Devuelve la partida, nueva o la que ya tuvieran abierta de ese juego.
create function public.challenge_inviter(code text, game text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  inviter uuid;
  existing uuid;
  created uuid;
begin
  if me is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;
  select f.user_id into inviter from public.friend_codes f where f.code = upper(trim(challenge_inviter.code));
  if inviter is null or inviter = me then
    raise exception 'Código no válido' using errcode = 'P0002';
  end if;

  if not exists (select 1 from private.referrals r where r.referred_id = me and r.referrer_id = inviter) then
    return public.create_match(challenge_inviter.game, inviter);
  end if;
  -- Por turnos: los de en directo necesitan a los dos conectados a la vez.
  if challenge_inviter.game not in ('tictactoe', 'connect4', 'reversi', 'dots', 'chess', 'battleship', 'rps', 'rpsls') then
    raise exception 'Juego no válido' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'match:' || challenge_inviter.game || least(me, inviter)::text || greatest(me, inviter)::text, 0));
  select m.id into existing
  from public.matches m
  where m.game = challenge_inviter.game
    and m.status in ('pending', 'active')
    and least(m.player_x, m.player_o) = least(me, inviter)
    and greatest(m.player_x, m.player_o) = greatest(me, inviter);
  if existing is not null then
    return existing;
  end if;

  insert into public.matches (game, player_x, player_o, created_by, status)
  values (challenge_inviter.game, me, inviter, me, 'active')
  returning id into created;
  return created;
end;
$$;

revoke execute on function public.get_invite(text), public.challenge_inviter(text, text) from public, anon, authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.challenge_inviter(text, text) to authenticated;

-- Borra las cuentas de invitado (anónimas) que nadie ha guardado y llevan 30
-- días sin usarse. Con la cuenta se va todo lo suyo (on delete cascade).
create function private.cleanup_guests(at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from auth.users u
  where u.is_anonymous
    and u.created_at < at - interval '30 days'
    and not exists (
      select 1 from private.daily_activity a
      where a.user_id = u.id and a.day > private.game_day(at) - 30
    );
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function private.cleanup_guests(timestamptz) from public;

select cron.schedule('cleanup-guests', '30 4 * * *', 'select private.cleanup_guests()');
