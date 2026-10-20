-- Apoyos (supporters). Lemon Squeezy avisa de los pagos por webhook; el
-- servidor de Next verifica la firma y registra aquí cada evento con la
-- service role. Si un evento llega dos veces, la clave única lo descarta.

create table public.supporter_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'lemonsqueezy',
  -- Id del pedido o suscripción en el proveedor + tipo de evento.
  provider_ref text not null,
  event text not null,
  user_id uuid references public.profiles (id) on delete set null,
  active boolean not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint supporter_events_once unique (provider, provider_ref, event)
);

create index supporter_events_user_idx on public.supporter_events (user_id, created_at desc);

-- Nadie lo lee desde el cliente: es un registro interno.
alter table public.supporter_events enable row level security;
revoke all on public.supporter_events from anon, authenticated;

-- Aplica un evento ya verificado. Devuelve false si estaba repetido.
create function public.apply_supporter_event(
  provider_ref text,
  event text,
  user_id uuid,
  active boolean,
  payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.supporter_events (provider_ref, event, user_id, active, payload)
  values (apply_supporter_event.provider_ref, apply_supporter_event.event, apply_supporter_event.user_id,
          apply_supporter_event.active, apply_supporter_event.payload)
  on conflict on constraint supporter_events_once do nothing;

  if not found then
    return false;
  end if;

  if apply_supporter_event.user_id is not null then
    -- Al retirarlo, el trigger check_supporter_avatar quita las partes exclusivas.
    update public.profiles p
    set supporter_tier = case when apply_supporter_event.active then 'supporter' end,
        supporter_since = case
          when apply_supporter_event.active then coalesce(p.supporter_since, now())
        end
    where p.id = apply_supporter_event.user_id;
  end if;
  return true;
end;
$$;

revoke execute on function public.apply_supporter_event(text, text, uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.apply_supporter_event(text, text, uuid, boolean, jsonb) to service_role;
