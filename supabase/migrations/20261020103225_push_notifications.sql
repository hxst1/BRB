-- Notificaciones push.
--
-- Cada dispositivo que acepta notificaciones guarda aquí su suscripción.
-- Cuando pasa algo que interesa a alguien (mensaje nuevo, le toca, solicitud
-- de amistad), un trigger avisa por HTTP (pg_net) al servidor de Next, que
-- decide a quién notificar y envía el push. La URL y el secreto compartido
-- viven en Vault (push_webhook_url, push_webhook_secret); si no están, no se
-- envía nada.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Cada usuario ve sus dispositivos"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

-- Guarda la suscripción de este dispositivo. Si el navegador ya estaba
-- registrado con otra cuenta (cambio de usuario), pasa a la actual.
create function public.save_push_subscription(endpoint text, p256dh text, auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '28000';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), save_push_subscription.endpoint, save_push_subscription.p256dh, save_push_subscription.auth)
  -- Por nombre de restricción: `(endpoint)` sería ambiguo con el parámetro.
  on conflict on constraint push_subscriptions_endpoint_key do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

create function public.delete_push_subscription(endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s
  where s.endpoint = delete_push_subscription.endpoint and s.user_id = auth.uid();
$$;

revoke execute on function public.save_push_subscription(text, text, text), public.delete_push_subscription(text)
from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, text, text), public.delete_push_subscription(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Avisos al servidor
-- ---------------------------------------------------------------------------

-- Envía el cambio (mismo formato que los webhooks de Supabase) al servidor.
-- pg_net es asíncrono: no retrasa ni hace fallar la operación original.
create function private.notify_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if url is null or secret is null then
    return null;
  end if;

  perform net.http_post(
    url := url,
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object(
      'table', tg_table_name,
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
    ),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

create trigger notify_push_messages
  after insert on public.messages
  for each row execute function private.notify_push();

create trigger notify_push_friendships
  after insert on public.friendships
  for each row execute function private.notify_push();

-- Solo cuando cambia algo que puede interesar: una jugada o el estado.
create trigger notify_push_matches
  after update of moves, status on public.matches
  for each row
  when (old.moves is distinct from new.moves or old.status is distinct from new.status)
  execute function private.notify_push();
