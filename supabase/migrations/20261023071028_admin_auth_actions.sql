-- Acciones del panel sobre las cuentas que no pasan por SQL (se hacen con la
-- API de administración de Supabase Auth): restablecer la contraseña a mano o
-- generar un enlace para que la cambie el usuario. Así quedan en la auditoría,
-- con motivo obligatorio como el resto de acciones delicadas.

create function public.admin_log_auth_action(admin_id uuid, action text, target_user uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if action not in ('set_password', 'password_reset_link') then
    raise exception 'Acción no válida' using errcode = '22023';
  end if;
  perform private.require_reason(reason);
  if not exists (select 1 from auth.users u where u.id = target_user) then
    raise exception 'No existe ese usuario' using errcode = 'P0002';
  end if;
  perform private.admin_log(admin_log_auth_action.admin_id, admin_log_auth_action.action,
    admin_log_auth_action.target_user, null, admin_log_auth_action.reason);
end;
$$;

revoke execute on function public.admin_log_auth_action(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_log_auth_action(uuid, text, uuid, text) to service_role;
