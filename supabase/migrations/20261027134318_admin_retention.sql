-- Para el panel de admin: retención por día de alta (cohorte). Con pocos
-- usuarios, lo que dice si la app engancha: cuántos de los que se registran
-- un día llegan a jugar, vuelven al día siguiente y vuelven en su primera semana.
--
--   signups   cuentas creadas ese día (hora de Madrid).
--   played    de ellas, las que han terminado al menos una partida (cuando sea).
--   d1        las que usaron la app al día siguiente del alta.
--   week1     las que la usaron algún día del 1 al 7 después del alta.
-- d1 y week1 solo cuentan cuando ese día ya ha pasado (si no, null).

create function public.admin_retention(days integer default 30)
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

revoke execute on function public.admin_retention(integer) from public, anon, authenticated;
grant execute on function public.admin_retention(integer) to service_role;
