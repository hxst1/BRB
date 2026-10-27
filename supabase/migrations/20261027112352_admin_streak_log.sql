-- Para el panel de admin: el calendario de racha de un usuario (qué días jugó
-- y cuáles le salvó un protector). Solo lectura, así que no va a la auditoría.

create function public.admin_user_streak_log(target_user uuid, days integer default 120)
returns table (day date, kind text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.day, l.kind
  from private.streak_log l
  where l.user_id = target_user
    and l.day > private.game_day() - least(greatest(days, 1), 3660)
  order by l.day;
$$;

revoke execute on function public.admin_user_streak_log(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_user_streak_log(uuid, integer) to service_role;
