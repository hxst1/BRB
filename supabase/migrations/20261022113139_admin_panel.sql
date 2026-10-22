-- Backend del panel de admin (repo brb-admin): auditoría, acciones de admin,
-- actividad diaria, estadísticas y errores de la app.
--
-- Todas las funciones public.admin_* son solo para service_role: el servidor
-- del panel comprueba antes que quien llama es admin y pasa su id (admin_id).
-- Errores: motivo que falta → 22023; algo que no existe → P0002.

-- ===========================================================================
-- 1. Auditoría
-- ===========================================================================

create table private.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  action text not null,
  target_user uuid references public.profiles (id) on delete set null,
  target_ref text,
  reason text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_target_idx on private.admin_audit (target_user, created_at desc);
create index admin_audit_created_idx on private.admin_audit (created_at desc);

create function private.admin_log(
  admin_id uuid, action text, target_user uuid, target_ref text, reason text, details jsonb default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.admin_audit (admin_id, action, target_user, target_ref, reason, details)
  values (admin_log.admin_id, admin_log.action, admin_log.target_user, admin_log.target_ref,
          nullif(trim(admin_log.reason), ''), coalesce(admin_log.details, '{}'));
$$;

-- Motivo obligatorio (3 caracteres como mínimo).
create function private.require_reason(reason text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(reason, ''))) < 3 then
    raise exception 'Hace falta un motivo' using errcode = '22023';
  end if;
end;
$$;

create function public.admin_get_audit(target_user uuid default null, max_rows integer default 50)
returns table (
  id bigint, admin_id uuid, admin_username text, action text, target_user uuid,
  target_ref text, reason text, details jsonb, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.admin_id, p.username, a.action, a.target_user, a.target_ref, a.reason, a.details, a.created_at
  from private.admin_audit a
  left join public.profiles p on p.id = a.admin_id
  where admin_get_audit.target_user is null or a.target_user = admin_get_audit.target_user
  order by a.created_at desc, a.id desc
  limit least(greatest(admin_get_audit.max_rows, 1), 500);
$$;

-- ===========================================================================
-- 2. Escrituras
-- ===========================================================================

-- Invalida una partida terminada: pasa a 'rejected' con 'admin: <motivo>'
-- (conserva finished_at) y resta la XP que dio. Devuelve la XP quitada.
create function public.admin_invalidate_run(admin_id uuid, run_id uuid, reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  run public.game_runs;
  gained integer;
  removed integer;
begin
  perform private.require_reason(admin_invalidate_run.reason);
  select * into run from public.game_runs r where r.id = admin_invalidate_run.run_id for update;
  if not found or run.status <> 'finished' then
    raise exception 'No hay ninguna partida terminada con ese id' using errcode = 'P0002';
  end if;

  gained := private.xp_for_run(run.game, run.score);
  select least(p.xp, gained) into removed from public.profiles p where p.id = run.user_id;

  update public.game_runs r
  set status = 'rejected', rejection_reason = 'admin: ' || trim(admin_invalidate_run.reason)
  where r.id = run.id;
  update public.profiles p set xp = greatest(0, p.xp - gained) where p.id = run.user_id;

  perform private.admin_log(admin_invalidate_run.admin_id, 'invalidate_run', run.user_id, run.id::text,
    admin_invalidate_run.reason, jsonb_build_object('game', run.game, 'score', run.score, 'xp', coalesce(removed, 0)));
  return coalesce(removed, 0);
end;
$$;

-- Invalida todas las partidas terminadas de alguien en un juego (o en todos).
create function public.admin_reset_scores(admin_id uuid, user_id uuid, reason text, game text default null)
returns table (runs integer, xp integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids uuid[];
  gained integer;
  removed integer;
begin
  perform private.require_reason(admin_reset_scores.reason);
  if not exists (select 1 from public.profiles p where p.id = admin_reset_scores.user_id) then
    raise exception 'No existe ese usuario' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(r.id), '{}'), coalesce(sum(private.xp_for_run(r.game, r.score)), 0)
  into ids, gained
  from public.game_runs r
  where r.user_id = admin_reset_scores.user_id
    and r.status = 'finished'
    and (admin_reset_scores.game is null or r.game = admin_reset_scores.game);

  select least(p.xp, gained) into removed from public.profiles p where p.id = admin_reset_scores.user_id;

  update public.game_runs r
  set status = 'rejected', rejection_reason = 'admin: ' || trim(admin_reset_scores.reason)
  where r.id = any (ids);
  update public.profiles p set xp = greatest(0, p.xp - gained) where p.id = admin_reset_scores.user_id;

  perform private.admin_log(admin_reset_scores.admin_id, 'reset_scores', admin_reset_scores.user_id,
    admin_reset_scores.game, admin_reset_scores.reason,
    jsonb_build_object('game', admin_reset_scores.game, 'run_ids', to_jsonb(ids), 'xp', removed));

  return query select cardinality(ids), removed;
end;
$$;

-- Cambia el estado de un mensaje de un jugador y su respuesta (el panel manda los dos).
create function public.admin_update_feedback(
  admin_id uuid, feedback_id uuid, status text, reply text, reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before public.feedback;
  replied text := nullif(trim(admin_update_feedback.reply), '');
begin
  select * into before from public.feedback f where f.id = admin_update_feedback.feedback_id for update;
  if not found then
    raise exception 'No existe ese mensaje' using errcode = 'P0002';
  end if;

  update public.feedback f
  set status = admin_update_feedback.status, admin_reply = replied
  where f.id = before.id;

  perform private.admin_log(admin_update_feedback.admin_id, 'update_feedback', before.user_id, before.id::text,
    admin_update_feedback.reason,
    jsonb_build_object('from_status', before.status, 'to_status', admin_update_feedback.status, 'replied', replied is not null));
end;
$$;

-- Asigna un pago (p. ej. de Ko-fi sin cuenta) a un usuario. Si el pago da el
-- apoyo, el usuario pasa a apoyar el proyecto.
create function public.admin_assign_supporter_event(admin_id uuid, event_id uuid, user_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  event public.supporter_events;
begin
  select * into event from public.supporter_events e where e.id = admin_assign_supporter_event.event_id for update;
  if not found or not exists (select 1 from public.profiles p where p.id = admin_assign_supporter_event.user_id) then
    raise exception 'No existe ese pago o ese usuario' using errcode = 'P0002';
  end if;

  update public.supporter_events e set user_id = admin_assign_supporter_event.user_id where e.id = event.id;
  if event.active then
    update public.profiles p
    set supporter_tier = 'supporter', supporter_since = coalesce(p.supporter_since, now())
    where p.id = admin_assign_supporter_event.user_id;
  end if;

  perform private.admin_log(admin_assign_supporter_event.admin_id, 'assign_supporter_event',
    admin_assign_supporter_event.user_id, event.id::text, admin_assign_supporter_event.reason,
    jsonb_build_object('provider', event.provider, 'previous_user', event.user_id, 'active', event.active));
end;
$$;

-- Da o quita el apoyo a mano (p. ej. GitHub Sponsors). Al quitarlo, el
-- disparador check_supporter_avatar le quita las partes exclusivas.
create function public.admin_set_supporter(admin_id uuid, user_id uuid, active boolean, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_reason(admin_set_supporter.reason);
  update public.profiles p
  set supporter_tier = case when admin_set_supporter.active then 'supporter' end,
      supporter_since = case when admin_set_supporter.active then coalesce(p.supporter_since, now()) end
  where p.id = admin_set_supporter.user_id;
  if not found then
    raise exception 'No existe ese usuario' using errcode = 'P0002';
  end if;

  perform private.admin_log(admin_set_supporter.admin_id, 'set_supporter', admin_set_supporter.user_id, null,
    admin_set_supporter.reason, jsonb_build_object('active', admin_set_supporter.active));
end;
$$;

-- Cambia el nombre de alguien (p. ej. uno ofensivo). Las reglas de nombres
-- de la tabla siguen aplicando (formato y que no esté cogido).
create function public.admin_rename_user(admin_id uuid, user_id uuid, username text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before text;
begin
  perform private.require_reason(admin_rename_user.reason);
  select p.username into before from public.profiles p where p.id = admin_rename_user.user_id for update;
  if not found then
    raise exception 'No existe ese usuario' using errcode = 'P0002';
  end if;

  update public.profiles p set username = trim(admin_rename_user.username) where p.id = admin_rename_user.user_id;

  perform private.admin_log(admin_rename_user.admin_id, 'rename_user', admin_rename_user.user_id, null,
    admin_rename_user.reason, jsonb_build_object('from', before, 'to', trim(admin_rename_user.username)));
end;
$$;

-- ===========================================================================
-- 3. Actividad diaria
-- ===========================================================================

-- Quién ha usado la app cada día (día de juego, hora de Madrid).
create table private.daily_activity (
  day date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (day, user_id)
);

create index daily_activity_user_idx on private.daily_activity (user_id, day desc);

create function private.touch_activity(player uuid, at timestamptz default now())
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.daily_activity (day, user_id)
  select private.game_day(coalesce(touch_activity.at, now())), touch_activity.player
  where touch_activity.player is not null
  on conflict do nothing;
$$;

create function private.activity_on_presence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.touch_activity(new.user_id, new.seen_at);
  return null;
end;
$$;

create trigger activity_on_presence
  after insert or update on public.presence
  for each row execute function private.activity_on_presence();

create function private.activity_on_run_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.touch_activity(new.user_id, new.finished_at);
  return null;
end;
$$;

create trigger activity_on_run_finished
  after update of status on public.game_runs
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.activity_on_run_finished();

create function private.activity_on_match_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.touch_activity(new.player_x, new.updated_at);
  perform private.touch_activity(new.player_o, new.updated_at);
  return null;
end;
$$;

create trigger activity_on_match_finished
  after update of status on public.matches
  for each row
  when (new.status = 'finished' and old.status is distinct from 'finished')
  execute function private.activity_on_match_finished();

-- Lo que ya había.
insert into private.daily_activity (day, user_id)
select private.game_day(seen_at), user_id from public.presence
union
select private.game_day(finished_at), user_id from public.game_runs where status = 'finished' and finished_at is not null
union
select private.game_day(updated_at), player_x from public.matches where status = 'finished'
union
select private.game_day(updated_at), player_o from public.matches where status = 'finished'
on conflict do nothing;

-- ===========================================================================
-- 4. Lecturas para el resumen y la lista de usuarios
-- ===========================================================================

-- Inicio (hora de Madrid) del día de juego de hace `days - 1` días.
create function private.days_start(days integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((private.game_day() - (greatest(days, 1) - 1))::timestamp) at time zone 'Europe/Madrid';
$$;

create function public.admin_daily_stats(days integer default 30)
returns table (day date, active_users integer, new_users integer, solo_runs integer, matches integer, messages integer)
language sql
stable
security definer
set search_path = ''
as $$
  with span as (
    select private.days_start(admin_daily_stats.days) as since
  ), days as (
    select d::date as day
    from span, generate_series(private.game_day(span.since), private.game_day(), interval '1 day') d
  ), active as (
    select a.day, count(*) as n from private.daily_activity a, span
    where a.day >= private.game_day(span.since) group by a.day
  ), joined as (
    select private.game_day(p.created_at) as day, count(*) as n from public.profiles p, span
    where p.created_at >= span.since group by 1
  ), runs as (
    select private.game_day(r.finished_at) as day, count(*) as n from public.game_runs r, span
    where r.status = 'finished' and r.finished_at >= span.since group by 1
  ), played as (
    select private.game_day(m.updated_at) as day, count(*) as n from public.matches m, span
    where m.status = 'finished' and m.updated_at >= span.since group by 1
  ), sent as (
    select private.game_day(m.created_at) as day, count(*) as n from public.messages m, span
    where m.created_at >= span.since group by 1
  )
  select days.day,
         coalesce(active.n, 0)::integer, coalesce(joined.n, 0)::integer, coalesce(runs.n, 0)::integer,
         coalesce(played.n, 0)::integer, coalesce(sent.n, 0)::integer
  from days
  left join active on active.day = days.day
  left join joined on joined.day = days.day
  left join runs on runs.day = days.day
  left join played on played.day = days.day
  left join sent on sent.day = days.day
  order by days.day;
$$;

-- Partidas terminadas por juego (en solitario, con su dificultad; contra amigos, por juego).
create function public.admin_games_played(days integer default 30)
returns table (kind text, game text, plays integer, players integer)
language sql
stable
security definer
set search_path = ''
as $$
  select 'solo', r.game, count(*)::integer, count(distinct r.user_id)::integer
  from public.game_runs r
  where r.status = 'finished' and r.finished_at >= private.days_start(admin_games_played.days)
  group by r.game
  union all
  select 'match', m.game, count(distinct m.id)::integer, count(distinct player)::integer
  from public.matches m
  cross join lateral unnest(array[m.player_x, m.player_o]) player
  where m.status = 'finished' and m.updated_at >= private.days_start(admin_games_played.days)
  group by m.game
  order by 3 desc;
$$;

-- ===========================================================================
-- 5. Errores de la app (tipo Sentry, en casa)
-- ===========================================================================

create table private.error_groups (
  fingerprint text primary key,
  message text not null,
  source text not null check (source in ('client', 'server')),
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  count bigint not null default 0,
  last_version text,
  resolved_version text,
  resolved_at timestamptz
);

create index error_groups_status_idx on private.error_groups (status, last_seen desc);

create table private.app_errors (
  id bigint generated always as identity primary key,
  fingerprint text not null references private.error_groups (fingerprint) on delete cascade,
  message text not null,
  stack text,
  path text,
  user_id uuid references public.profiles (id) on delete set null,
  user_agent text,
  app_version text,
  source text not null check (source in ('client', 'server')),
  created_at timestamptz not null default now()
);

create index app_errors_fingerprint_idx on private.app_errors (fingerprint, created_at desc);
create index app_errors_created_idx on private.app_errors (created_at);

-- Huella de un error: el mensaje sin lo que cambia entre apariciones (URLs,
-- ids, números) y la función de la primera línea útil de la pila (sin
-- archivos ni posiciones, que cambian en cada despliegue).
create function private.error_fingerprint(message text, stack text)
returns text
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select regexp_replace(
             regexp_replace(
               regexp_replace(coalesce(message, ''), 'https?://\S+', '<url>', 'g'),
               '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', 'gi'),
             '\d+', '<n>', 'g') as text
  ), frame as (
    select coalesce(
      (select coalesce(substring(line from '^\s*at\s+(?:async\s+)?([^\s(]+)\s+\('), substring(line from '^\s*([^@\s]+)@'))
       from unnest(string_to_array(coalesce(stack, ''), E'\n')) with ordinality as l(line, n)
       where line !~ 'node_modules'
         and (line ~ '^\s*at\s+(async\s+)?[^\s(]+\s+\(' or line ~ '^\s*[^@\s]+@')
       order by n
       limit 1),
      '') as name
  )
  select md5(normalized.text || '|' || frame.name) from normalized, frame;
$$;

-- Guarda un error (lo llama la web con la clave secreta). Siempre suma al
-- grupo; el detalle, como mucho 100 filas por huella y hora. Un error
-- resuelto que vuelve en otra versión se reabre. Devuelve la huella.
create function public.report_app_error(
  message text, stack text default null, path text default null, user_id uuid default null,
  user_agent text default null, app_version text default null, source text default 'client'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg text := left(coalesce(nullif(trim(report_app_error.message), ''), 'Error sin mensaje'), 1000);
  trace text := left(report_app_error.stack, 8000);
  origin text := case when report_app_error.source = 'server' then 'server' else 'client' end;
  version text := left(report_app_error.app_version, 40);
  fp text := private.error_fingerprint(msg, trace);
begin
  insert into private.error_groups as g (fingerprint, message, source, count, last_version)
  values (fp, msg, origin, 1, version)
  on conflict (fingerprint) do update
  set count = g.count + 1,
      last_seen = now(),
      last_version = coalesce(excluded.last_version, g.last_version),
      status = case
        when g.status = 'resolved' and excluded.last_version is distinct from g.resolved_version then 'open'
        else g.status
      end,
      resolved_at = case
        when g.status = 'resolved' and excluded.last_version is distinct from g.resolved_version then null
        else g.resolved_at
      end;

  if (select count(*) from private.app_errors e
      where e.fingerprint = fp and e.created_at >= date_trunc('hour', now())) < 100 then
    insert into private.app_errors (fingerprint, message, stack, path, user_id, user_agent, app_version, source)
    values (fp, msg, trace, left(report_app_error.path, 300),
            (select p.id from public.profiles p where p.id = report_app_error.user_id),
            left(report_app_error.user_agent, 400), version, origin);
  end if;
  return fp;
end;
$$;

-- Usuarios afectados (últimos 30 días) y las pantallas y navegadores más frecuentes.
create function private.error_group_summary(fingerprint text)
returns table (users integer, paths text[], user_agents text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(distinct e.user_id)::integer from private.app_errors e
     where e.fingerprint = error_group_summary.fingerprint and e.created_at > now() - interval '30 days'),
    array(select e.path from private.app_errors e
          where e.fingerprint = error_group_summary.fingerprint and e.path is not null
          group by e.path order by count(*) desc, e.path limit 5),
    array(select e.user_agent from private.app_errors e
          where e.fingerprint = error_group_summary.fingerprint and e.user_agent is not null
          group by e.user_agent order by count(*) desc, e.user_agent limit 5);
$$;

-- status null: todos.
create function public.admin_list_error_groups(status text default 'open', max_rows integer default 50)
returns table (
  fingerprint text, message text, source text, status text, first_seen timestamptz, last_seen timestamptz,
  count bigint, users integer, last_version text, paths text[], user_agents text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.fingerprint, g.message, g.source, g.status, g.first_seen, g.last_seen, g.count,
         s.users, g.last_version, s.paths, s.user_agents
  from private.error_groups g
  cross join lateral private.error_group_summary(g.fingerprint) s
  where admin_list_error_groups.status is null or g.status = admin_list_error_groups.status
  order by g.last_seen desc
  limit least(greatest(admin_list_error_groups.max_rows, 1), 500);
$$;

create function public.admin_get_error_group(fingerprint text)
returns table (
  fingerprint text, message text, source text, status text, first_seen timestamptz, last_seen timestamptz,
  count bigint, users integer, last_version text, paths text[], user_agents text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.fingerprint, g.message, g.source, g.status, g.first_seen, g.last_seen, g.count,
         s.users, g.last_version, s.paths, s.user_agents
  from private.error_groups g
  cross join lateral private.error_group_summary(g.fingerprint) s
  where g.fingerprint = admin_get_error_group.fingerprint;
$$;

create function public.admin_get_error_events(fingerprint text, max_rows integer default 20)
returns table (
  id bigint, message text, stack text, path text, user_id uuid, username text, friend_code text,
  user_agent text, app_version text, source text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.message, e.stack, e.path, e.user_id, p.username, c.code, e.user_agent, e.app_version, e.source, e.created_at
  from private.app_errors e
  left join public.profiles p on p.id = e.user_id
  left join public.friend_codes c on c.user_id = e.user_id
  where e.fingerprint = admin_get_error_events.fingerprint
  order by e.created_at desc, e.id desc
  limit least(greatest(admin_get_error_events.max_rows, 1), 200);
$$;

create function public.admin_set_error_status(admin_id uuid, fingerprint text, status text, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before text;
begin
  select g.status into before from private.error_groups g where g.fingerprint = admin_set_error_status.fingerprint for update;
  if not found then
    raise exception 'No existe ese error' using errcode = 'P0002';
  end if;

  update private.error_groups g
  set status = admin_set_error_status.status,
      resolved_version = case when admin_set_error_status.status = 'resolved' then g.last_version end,
      resolved_at = case when admin_set_error_status.status = 'resolved' then now() end
  where g.fingerprint = admin_set_error_status.fingerprint;

  perform private.admin_log(admin_set_error_status.admin_id, 'set_error_status', null, admin_set_error_status.fingerprint,
    admin_set_error_status.reason, jsonb_build_object('from', before, 'to', admin_set_error_status.status));
end;
$$;

-- Limpieza diaria: errores de más de 30 días.
create function private.purge_app_errors()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.app_errors where created_at < now() - interval '30 days';
  delete from private.error_groups where last_seen < now() - interval '30 days';
$$;

select cron.schedule('purge-app-errors', '40 3 * * *', 'select private.purge_app_errors()');

-- Lo que pide atención en la portada del panel.
create function public.admin_attention()
returns table (open_errors integer, new_errors_24h integer, unread_feedback integer, unlinked_payments integer, rejected_runs_24h integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from private.error_groups where status = 'open'),
    (select count(*)::integer from private.error_groups where first_seen > now() - interval '24 hours'),
    (select count(*)::integer from public.feedback where status = 'new'),
    (select count(*)::integer from public.supporter_events where user_id is null),
    (select count(*)::integer from public.game_runs
     where status = 'rejected' and finished_at > now() - interval '24 hours'
       and coalesce(rejection_reason, '') not like 'admin: %');
$$;

-- Lista de usuarios, sin emails. Busca por nombre (contiene) o por código de amigo (exacto).
create function public.admin_list_users(search text default null, max_rows integer default 50, skip integer default 0)
returns table (
  id uuid, username text, avatar_seed bigint, avatar_parts jsonb, friend_code text, xp integer,
  streak_days integer, streak_best integer, streak_last_day date, created_at timestamptz, seen_at timestamptz,
  supporter_tier text, push_devices integer, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select nullif(trim(admin_list_users.search), '') as text
  )
  select p.id, p.username, p.avatar_seed, p.avatar_parts, c.code, p.xp,
         p.streak_days, p.streak_best, p.streak_last_day, p.created_at, pr.seen_at,
         p.supporter_tier,
         (select count(*)::integer from public.push_subscriptions s where s.user_id = p.id),
         count(*) over ()
  from public.profiles p
  cross join q
  left join public.friend_codes c on c.user_id = p.id
  left join public.presence pr on pr.user_id = p.id
  where q.text is null
     or p.username ilike '%' || replace(replace(replace(q.text, '\', '\\'), '%', '\%'), '_', '\_') || '%'
     or c.code = upper(q.text)
  order by pr.seen_at desc nulls last, p.created_at desc
  limit least(greatest(admin_list_users.max_rows, 1), 200)
  offset greatest(admin_list_users.skip, 0);
$$;

-- ===========================================================================
-- Permisos
-- ===========================================================================

revoke execute on function
  public.admin_get_audit(uuid, integer),
  public.admin_invalidate_run(uuid, uuid, text),
  public.admin_reset_scores(uuid, uuid, text, text),
  public.admin_update_feedback(uuid, uuid, text, text, text),
  public.admin_assign_supporter_event(uuid, uuid, uuid, text),
  public.admin_set_supporter(uuid, uuid, boolean, text),
  public.admin_rename_user(uuid, uuid, text, text),
  public.admin_daily_stats(integer),
  public.admin_games_played(integer),
  public.report_app_error(text, text, text, uuid, text, text, text),
  public.admin_list_error_groups(text, integer),
  public.admin_get_error_group(text),
  public.admin_get_error_events(text, integer),
  public.admin_set_error_status(uuid, text, text, text),
  public.admin_attention(),
  public.admin_list_users(text, integer, integer)
from public, anon, authenticated;

grant execute on function
  public.admin_get_audit(uuid, integer),
  public.admin_invalidate_run(uuid, uuid, text),
  public.admin_reset_scores(uuid, uuid, text, text),
  public.admin_update_feedback(uuid, uuid, text, text, text),
  public.admin_assign_supporter_event(uuid, uuid, uuid, text),
  public.admin_set_supporter(uuid, uuid, boolean, text),
  public.admin_rename_user(uuid, uuid, text, text),
  public.admin_daily_stats(integer),
  public.admin_games_played(integer),
  public.report_app_error(text, text, text, uuid, text, text, text),
  public.admin_list_error_groups(text, integer),
  public.admin_get_error_group(text),
  public.admin_get_error_events(text, integer),
  public.admin_set_error_status(uuid, text, text, text),
  public.admin_attention(),
  public.admin_list_users(text, integer, integer)
to service_role;

revoke execute on function
  private.admin_log(uuid, text, uuid, text, text, jsonb),
  private.require_reason(text),
  private.touch_activity(uuid, timestamptz),
  private.activity_on_presence(),
  private.activity_on_run_finished(),
  private.activity_on_match_finished(),
  private.days_start(integer),
  private.error_fingerprint(text, text),
  private.error_group_summary(text),
  private.purge_app_errors()
from public;
