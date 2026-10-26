-- Estadísticas por origen para el panel de admin (p. ej. el lanzamiento en
-- Product Hunt: needle = 'producthunt.com'). Genéricas: valen para cualquier
-- web de la que llegue gente.
--
-- Un "visitante de ese origen" es un visitor con al menos una página vista
-- cuyo referrer contiene `needle`. Como la huella del visitante es diaria, se
-- le atribuyen sus registros y su tiempo en la página (signup, leave) del
-- mismo día (private.game_day) que esa visita. Como mucho, los últimos 90 días.

-- Visitantes (huella y día) que llegaron desde ese origen.
create function private.referrer_sessions(needle text, since timestamptz)
returns table (visitor text, day date, start_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := greatest(coalesce(since, now()), now() - interval '90 days');
begin
  if needle is null or needle !~ '^[a-z0-9.-]{3,40}$' then
    raise exception 'Origen no válido' using errcode = '22023';
  end if;
  return query
    select distinct v.visitor, private.game_day(v.ts), cutoff
    from private.visits v
    where v.kind = 'pageview' and v.ts >= cutoff and v.referrer ilike '%' || needle || '%';
end;
$$;

-- Resumen: visitantes, páginas vistas desde ese origen, registros y tiempo medio.
create function public.admin_referrer_summary(needle text, since timestamptz)
returns table (visitors integer, pageviews integer, signups integer, avg_seconds integer)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select * from private.referrer_sessions(needle, since)
  ), attributed as (
    select v.*
    from private.visits v
    join s on s.visitor = v.visitor and s.day = private.game_day(v.ts)
    where v.ts >= s.start_at
  ), per_visitor as (
    select visitor, private.game_day(ts) as day, sum(seconds) as seconds
    from attributed where kind = 'leave' group by 1, 2
  )
  select
    (select count(*) from s)::integer,
    (select count(*) from attributed where kind = 'pageview' and referrer ilike '%' || needle || '%')::integer,
    (select count(*) from attributed where kind = 'signup')::integer,
    coalesce((select round(avg(seconds)) from per_visitor), 0)::integer;
$$;

-- Hora a hora (solo las horas con algo): los registros, por la hora del registro.
create function public.admin_referrer_hourly(needle text, since timestamptz)
returns table (hour timestamptz, visitors integer, pageviews integer, signups integer)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select * from private.referrer_sessions(needle, since)
  ), attributed as (
    select v.*
    from private.visits v
    join s on s.visitor = v.visitor and s.day = private.game_day(v.ts)
    where v.ts >= s.start_at
  ), views as (
    select date_trunc('hour', ts) as at, count(distinct visitor) as visitors, count(*) as pageviews
    from attributed where kind = 'pageview' and referrer ilike '%' || needle || '%' group by 1
  ), joins as (
    select date_trunc('hour', ts) as at, count(*) as signups from attributed where kind = 'signup' group by 1
  )
  select coalesce(views.at, joins.at), coalesce(views.visitors, 0)::integer, coalesce(views.pageviews, 0)::integer, coalesce(joins.signups, 0)::integer
  from views full join joins on joins.at = views.at
  order by 1;
$$;

-- Lo más repetido entre las visitas desde ese origen: país, dispositivo o página de entrada.
create function public.admin_referrer_top(needle text, since timestamptz, dimension text, max_rows integer default 10)
returns table (value text, visitors integer, signups integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if dimension not in ('country', 'device', 'path') then
    raise exception 'Dimensión no válida' using errcode = '22023';
  end if;
  return query
    with s as (
      select * from private.referrer_sessions(needle, since)
    ), seen as (
      select distinct
        case dimension when 'country' then v.country when 'device' then v.device else v.path end as value,
        v.visitor,
        private.game_day(v.ts) as day
      from private.visits v
      join s on s.visitor = v.visitor and s.day = private.game_day(v.ts)
      where v.kind = 'pageview' and v.ts >= s.start_at and v.referrer ilike '%' || needle || '%'
    ), joins as (
      select v.visitor, private.game_day(v.ts) as day, count(*) as n
      from private.visits v
      join s on s.visitor = v.visitor and s.day = private.game_day(v.ts)
      where v.kind = 'signup' and v.ts >= s.start_at
      group by 1, 2
    )
    select seen.value, count(*)::integer, coalesce(sum(joins.n), 0)::integer
    from seen left join joins on joins.visitor = seen.visitor and joins.day = seen.day
    group by seen.value
    order by 2 desc, 1
    limit least(greatest(max_rows, 1), 100);
end;
$$;

revoke execute on function private.referrer_sessions(text, timestamptz) from public;
revoke execute on function
  public.admin_referrer_summary(text, timestamptz),
  public.admin_referrer_hourly(text, timestamptz),
  public.admin_referrer_top(text, timestamptz, text, integer)
from public, anon, authenticated;
grant execute on function
  public.admin_referrer_summary(text, timestamptz),
  public.admin_referrer_hourly(text, timestamptz),
  public.admin_referrer_top(text, timestamptz, text, integer)
to service_role;
