-- Borrar una cuenta y todos sus datos, sin dejar rastro.
--
-- Casi todo cuelga de profiles con "on delete cascade" (partidas, amigos,
-- chats en los dos sentidos, retos, logros, avisos…). Lo que no se borraría
-- solo, se borra aquí: los pagos de apoyo (llevan el email), la auditoría del
-- panel sobre esa cuenta, sus errores y el registro de accesos de Supabase.
-- La llama el servidor tras comprobar la contraseña, el nombre y el código.

create function public.delete_account(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
begin
  select u.email into account_email from auth.users u where u.id = delete_account.target;
  if not found then
    raise exception 'No existe esa cuenta' using errcode = 'P0002';
  end if;

  delete from public.supporter_events e
  where e.user_id = delete_account.target
     or (account_email is not null and lower(e.payload ->> 'email') = lower(account_email));
  delete from private.admin_audit a where a.target_user = delete_account.target;
  delete from private.app_errors e where e.user_id = delete_account.target;
  delete from auth.audit_log_entries l
  where l.payload ->> 'actor_id' = delete_account.target::text
     or (account_email is not null and lower(l.payload ->> 'actor_username') = lower(account_email));

  -- El resto se va en cascada desde auth.users → profiles.
  delete from auth.users u where u.id = delete_account.target;
end;
$$;

revoke execute on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;
