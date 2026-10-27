-- Avisos (notificaciones push) del panel de admin (repo brb-admin).
--
-- Como los avisos de la app, pero hacia el servidor del panel, que tiene sus
-- propias claves VAPID y las suscripciones de los admins: la base de datos
-- llama con pg_net al webhook del panel (secretos de Vault
-- admin_push_webhook_url y admin_push_webhook_secret) con lo mínimo (ids), y
-- el panel lee el resto y decide a quién avisar. Sin los secretos no hace nada.
--
--   feedback    reporte nuevo: fallos e ideas siempre; valoraciones de 1 o 2 estrellas.
--   error       error nuevo, o uno resuelto que vuelve a salir (reopened).
--   supporter   apoyo nuevo (activo).
--   signups     cada hora (a los :07), cuántas cuentas se han creado en la última hora.

-- ---------------------------------------------------------------------------
-- Suscripciones de los admins
-- ---------------------------------------------------------------------------

create table private.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

-- Guarda (o actualiza) la suscripción de un dispositivo. Es un ajuste del
-- dispositivo: queda en la auditoría, sin motivo.
create function public.admin_save_push_subscription(admin_id uuid, endpoint text, p256dh text, auth text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved uuid;
begin
  insert into private.admin_push_subscriptions as s (admin_id, endpoint, p256dh, auth)
  values (admin_save_push_subscription.admin_id, admin_save_push_subscription.endpoint,
          admin_save_push_subscription.p256dh, admin_save_push_subscription.auth)
  on conflict on constraint admin_push_subscriptions_endpoint_key do update
  set admin_id = excluded.admin_id, p256dh = excluded.p256dh, auth = excluded.auth
  returning s.id into saved;

  perform private.admin_log(admin_save_push_subscription.admin_id, 'push_subscribe', null, saved::text, null, '{}'::jsonb);
  return saved;
end;
$$;

-- Borra una suscripción (al darse de baja, o si el servidor de push dice que ya no existe).
create function public.admin_delete_push_subscription(endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.admin_push_subscriptions s where s.endpoint = admin_delete_push_subscription.endpoint;
$$;

create function public.admin_list_push_subscriptions()
returns table (id uuid, admin_id uuid, endpoint text, p256dh text, auth text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.admin_id, s.endpoint, s.p256dh, s.auth, s.created_at
  from private.admin_push_subscriptions s
  order by s.created_at;
$$;

revoke execute on function
  public.admin_save_push_subscription(uuid, text, text, text),
  public.admin_delete_push_subscription(text),
  public.admin_list_push_subscriptions()
from public, anon, authenticated;
grant execute on function
  public.admin_save_push_subscription(uuid, text, text, text),
  public.admin_delete_push_subscription(text),
  public.admin_list_push_subscriptions()
to service_role;

-- ---------------------------------------------------------------------------
-- Webhook del panel
-- ---------------------------------------------------------------------------

create function private.notify_admin(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'admin_push_webhook_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'admin_push_webhook_secret';
  if url is null or secret is null then
    return;
  end if;

  perform net.http_post(
    url := url,
    headers := jsonb_build_object('content-type', 'application/json', 'x-admin-push-secret', secret),
    body := payload,
    timeout_milliseconds := 5000
  );
end;
$$;

revoke execute on function private.notify_admin(jsonb) from public;

create function private.admin_notify_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_admin(jsonb_build_object('type', 'feedback', 'id', new.id));
  return null;
end;
$$;

create trigger admin_notify_feedback
  after insert on public.feedback
  for each row
  when (new.kind in ('bug', 'idea') or (new.kind = 'rating' and new.rating <= 2))
  execute function private.admin_notify_feedback();

create function private.admin_notify_error()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_admin(jsonb_build_object('type', 'error', 'fingerprint', new.fingerprint, 'reopened', tg_op = 'UPDATE'));
  return null;
end;
$$;

create trigger admin_notify_error_new
  after insert on private.error_groups
  for each row
  execute function private.admin_notify_error();

create trigger admin_notify_error_reopened
  after update of status on private.error_groups
  for each row
  when (old.status = 'resolved' and new.status = 'open')
  execute function private.admin_notify_error();

create function private.admin_notify_supporter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_admin(jsonb_build_object('type', 'supporter', 'id', new.id));
  return null;
end;
$$;

create trigger admin_notify_supporter
  after insert on public.supporter_events
  for each row
  when (new.active)
  execute function private.admin_notify_supporter();

-- Cuentas nuevas de la última hora (si hay alguna). Devuelve cuántas.
create function private.admin_notify_signups(at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz := at - interval '1 hour';
  signups integer;
begin
  select count(*)::integer into signups from public.profiles p where p.created_at > since and p.created_at <= at;
  if signups > 0 then
    perform private.notify_admin(jsonb_build_object('type', 'signups', 'count', signups, 'since', since));
  end if;
  return signups;
end;
$$;

revoke execute on function
  private.admin_notify_feedback(),
  private.admin_notify_error(),
  private.admin_notify_supporter(),
  private.admin_notify_signups(timestamptz)
from public;

select cron.schedule('admin-signups', '7 * * * *', 'select private.admin_notify_signups()');
