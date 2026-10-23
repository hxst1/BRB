-- Estadísticas de visitas para el panel (países, tiempo a la vista y cuántos
-- acaban registrándose), sin cookies ni IPs guardadas:
--
-- - `visitor` es un hash de IP + navegador con una sal secreta que cambia cada
--   día (lo calcula Next): cuenta visitantes únicos de un día, pero no permite
--   seguir a nadie de un día a otro.
-- - Las rutas llegan sin ids (/3-en-raya/:id) y el país lo da Vercel.
-- - Se borra sola a los 13 meses.
-- - Vive en `private`: solo la escribe record_visit y la leen las funciones admin_*.

create table private.visits (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  kind text not null check (kind in ('pageview', 'leave', 'signup')),
  path text not null default '' check (char_length(path) <= 120),
  lang text not null default '' check (lang in ('', 'es', 'en')),
  referrer text not null default '' check (char_length(referrer) <= 80),
  country text not null default '' check (country ~ '^([A-Z]{2})?$'),
  device text not null default '' check (device in ('', 'mobile', 'tablet', 'desktop')),
  signed_in boolean not null default false,
  -- Solo en `leave`: segundos que la página estuvo a la vista.
  seconds integer check (seconds between 0 and 3600),
  visitor text not null check (visitor ~ '^[0-9a-f]{16}$')
);

create index visits_ts_idx on private.visits (ts);
create index visits_visitor_idx on private.visits (visitor);

/** Guarda una visita (la llama la ruta /api/v de Next con service_role). */
create function public.record_visit(
  kind text, visitor text, path text default '', lang text default '', referrer text default '',
  country text default '', device text default '', signed_in boolean default false, seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.visits (kind, visitor, path, lang, referrer, country, device, signed_in, seconds)
  values (record_visit.kind, record_visit.visitor, left(record_visit.path, 120), record_visit.lang,
          left(record_visit.referrer, 80), record_visit.country, record_visit.device, record_visit.signed_in,
          case when record_visit.seconds is null then null else least(greatest(record_visit.seconds, 0), 3600) end);

  -- De vez en cuando, lo que tiene más de 13 meses (sin cron que configurar).
  if random() < 0.002 then
    delete from private.visits where ts < now() - interval '13 months';
  end if;
end;
$$;

-- Resumen del periodo: visitantes, páginas vistas, tiempo medio y registros.
create function public.admin_visits_summary(days integer default 30)
returns table (visitors integer, pageviews integer, avg_seconds integer, signups integer, signed_in_visitors integer)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select * from private.visits where ts >= private.days_start(admin_visits_summary.days)
  ), per_visitor as (
    -- Un visitante es un hash por día: el tiempo se suma por visitante y día.
    select visitor, sum(seconds) as seconds from v where kind = 'leave' group by visitor
  )
  select
    (select count(distinct visitor) from v where kind = 'pageview')::integer,
    (select count(*) from v where kind = 'pageview')::integer,
    coalesce((select round(avg(seconds)) from per_visitor), 0)::integer,
    (select count(*) from v where kind = 'signup')::integer,
    (select count(distinct visitor) from v where kind = 'pageview' and signed_in)::integer;
$$;

-- Por país: para el mapa del mundo.
create function public.admin_visits_by_country(days integer default 30)
returns table (country text, visitors integer, pageviews integer, avg_seconds integer, signups integer)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select * from private.visits where ts >= private.days_start(admin_visits_by_country.days)
  ), time_per_visitor as (
    select country, visitor, sum(seconds) as seconds from v where kind = 'leave' group by country, visitor
  )
  select v.country,
         count(distinct v.visitor) filter (where v.kind = 'pageview')::integer,
         count(*) filter (where v.kind = 'pageview')::integer,
         coalesce((select round(avg(t.seconds)) from time_per_visitor t where t.country = v.country), 0)::integer,
         count(*) filter (where v.kind = 'signup')::integer
  from v
  group by v.country
  order by 2 desc;
$$;

-- Día a día: visitantes, páginas vistas y registros.
create function public.admin_visits_daily(days integer default 30)
returns table (day date, visitors integer, pageviews integer, signups integer)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select d::date as day
    from generate_series(private.game_day(private.days_start(admin_visits_daily.days)), private.game_day(), interval '1 day') d
  ), v as (
    select private.game_day(ts) as day, kind, visitor from private.visits
    where ts >= private.days_start(admin_visits_daily.days)
  )
  select days.day,
         count(distinct v.visitor) filter (where v.kind = 'pageview')::integer,
         count(v.kind) filter (where v.kind = 'pageview')::integer,
         count(v.kind) filter (where v.kind = 'signup')::integer
  from days left join v on v.day = days.day
  group by days.day
  order by days.day;
$$;

-- Lo más visto: páginas, de dónde llegan, dispositivos o idiomas.
create function public.admin_visits_top(dimension text, days integer default 30, max_rows integer default 10)
returns table (value text, visitors integer, pageviews integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if dimension not in ('path', 'referrer', 'device', 'lang') then
    raise exception 'Dimensión no válida' using errcode = '22023';
  end if;
  return query
    select x.value, count(distinct x.visitor)::integer, count(*)::integer
    from (
      select case dimension when 'path' then v.path when 'referrer' then v.referrer when 'device' then v.device else v.lang end as value,
             v.visitor
      from private.visits v
      where v.kind = 'pageview' and v.ts >= private.days_start(admin_visits_top.days)
    ) x
    group by x.value
    order by 2 desc, 1
    limit least(greatest(max_rows, 1), 100);
end;
$$;

revoke execute on function
  public.record_visit(text, text, text, text, text, text, text, boolean, integer),
  public.admin_visits_summary(integer),
  public.admin_visits_by_country(integer),
  public.admin_visits_daily(integer),
  public.admin_visits_top(text, integer, integer)
from public, anon, authenticated;
grant execute on function
  public.record_visit(text, text, text, text, text, text, text, boolean, integer),
  public.admin_visits_summary(integer),
  public.admin_visits_by_country(integer),
  public.admin_visits_daily(integer),
  public.admin_visits_top(text, integer, integer)
to service_role;
