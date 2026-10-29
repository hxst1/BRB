-- Resumen del panel: los errores nuevos en 24 h solo cuentan los que siguen
-- abiertos. Antes contaba también los resueltos o ignorados, así que el aviso
-- no bajaba al cerrarlos (y el enlace lleva a la lista de abiertos).
-- Misma firma: create or replace conserva los permisos (solo service_role).

create or replace function public.admin_attention()
returns table (open_errors integer, new_errors_24h integer, unread_feedback integer, unlinked_payments integer, rejected_runs_24h integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from private.error_groups where status = 'open'),
    (select count(*)::integer from private.error_groups
     where status = 'open' and first_seen > now() - interval '24 hours'),
    (select count(*)::integer from public.feedback where status = 'new'),
    (select count(*)::integer from public.supporter_events where user_id is null),
    (select count(*)::integer from public.game_runs
     where status = 'rejected' and finished_at > now() - interval '24 hours'
       and coalesce(rejection_reason, '') not like 'admin: %');
$$;
