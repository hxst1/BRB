-- Apoyos por Ko-fi (y más adelante GitHub Sponsors) en lugar de Lemon Squeezy.
--
-- Ko-fi avisa de cada pago por webhook con el email de quien paga. El
-- servidor de Next comprueba el token, busca la cuenta con ese email y
-- registra el pago con apply_supporter_event, que ahora indica de qué
-- plataforma viene. Un pago de Ko-fi da la insignia sin caducidad.

alter table public.supporter_events alter column provider drop default;
alter table public.supporter_events add constraint supporter_events_provider_check
  check (provider in ('lemonsqueezy', 'kofi', 'github'));

drop function public.apply_supporter_event(text, text, uuid, boolean, jsonb);

-- Aplica un pago ya verificado. Devuelve false si el aviso estaba repetido.
create function public.apply_supporter_event(
  provider text,
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
  insert into public.supporter_events (provider, provider_ref, event, user_id, active, payload)
  values (apply_supporter_event.provider, apply_supporter_event.provider_ref, apply_supporter_event.event,
          apply_supporter_event.user_id, apply_supporter_event.active, apply_supporter_event.payload)
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

-- Cuenta con ese email (sin distinguir mayúsculas), o null. Solo el servidor.
create function public.user_id_by_email(email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(user_id_by_email.email)) limit 1;
$$;

revoke execute on function
  public.apply_supporter_event(text, text, text, uuid, boolean, jsonb),
  public.user_id_by_email(text)
from public, anon, authenticated;
grant execute on function
  public.apply_supporter_event(text, text, text, uuid, boolean, jsonb),
  public.user_id_by_email(text)
to service_role;

-- Cuenta con ese código de amigo, o null. Solo el servidor: en un pago de
-- Ko-fi, el código escrito en el mensaje asigna el pago aunque el email sea otro.
create function public.user_id_by_friend_code(code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select f.user_id from public.friend_codes f where f.code = upper(trim(user_id_by_friend_code.code)) limit 1;
$$;

revoke execute on function public.user_id_by_friend_code(text) from public, anon, authenticated;
grant execute on function public.user_id_by_friend_code(text) to service_role;
