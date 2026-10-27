-- Retención por origen: con source, la cohorte solo cuenta a quien vino de
-- ese lanzamiento (de momento, 'producthunt'). Se atribuye por el premio del
-- lanzamiento (private.launch_rewards): las visitas no se pueden unir con las
-- cuentas (se cuentan sin cookies, ver visits). Así que cuenta a quien llegó
-- desde allí con cuenta o la creó después, durante la semana del lanzamiento.
-- Sin source, todo sigue como antes. Cambia la firma: se borra y se crea otra
-- vez (las llamadas con solo days siguen valiendo).

drop function public.admin_retention(integer);

create function public.admin_retention(days integer default 30, source text default null)
returns table (cohort date, signups integer, played integer, d1 integer, week1 integer)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select private.game_day() as day
  ), users as (
    select p.id, private.game_day(p.created_at) as cohort
    from public.profiles p, today
    where p.created_at >= (today.day - least(greatest(days, 1), 365))::timestamptz - interval '1 day'
      and (
        admin_retention.source is null
        or exists (select 1 from private.launch_rewards r where r.user_id = p.id and r.source = admin_retention.source)
      )
  )
  select
    u.cohort,
    count(*)::integer,
    count(*) filter (where exists (select 1 from private.streak_log l where l.user_id = u.id and l.kind = 'played'))::integer,
    case when u.cohort + 1 < (select day from today) then
      count(*) filter (where exists (select 1 from private.daily_activity a where a.user_id = u.id and a.day = u.cohort + 1))::integer
    end,
    case when u.cohort + 7 < (select day from today) then
      count(*) filter (where exists (select 1 from private.daily_activity a where a.user_id = u.id and a.day between u.cohort + 1 and u.cohort + 7))::integer
    end
  from users u, today
  where u.cohort > today.day - least(greatest(days, 1), 365)
  group by u.cohort
  order by u.cohort desc;
$$;

revoke execute on function public.admin_retention(integer, text) from public, anon, authenticated;
grant execute on function public.admin_retention(integer, text) to service_role;
