-- Cambiar el nombre de usuario: cada uno puede cambiarse el suyo, como mucho
-- una vez cada 7 días (para que nadie se lo cambie a cada rato y confunda a
-- los demás). El servidor y el panel de admin (sin sesión de usuario) no
-- tienen ese límite.

alter table public.profiles add column username_changed_at timestamptz;

create function private.check_username_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is not distinct from old.username then
    return new;
  end if;
  -- Un nombre no válido o ya cogido lo rechazan el formato y el índice único,
  -- con su propio error (más útil que el de esperar).
  if new.username !~ '^[A-Za-z0-9_]{3,20}$'
     or exists (select 1 from public.profiles p where lower(p.username) = lower(new.username) and p.id <> new.id) then
    return new;
  end if;
  if auth.uid() is not null
     and old.username_changed_at is not null
     and old.username_changed_at > now() - interval '7 days' then
    raise exception 'Solo puedes cambiar el nombre una vez cada 7 días'
      using errcode = 'P0001', hint = 'username_cooldown',
            detail = to_char((old.username_changed_at + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;
  new.username_changed_at := now();
  return new;
end;
$$;

create trigger check_username_change
  before update of username on public.profiles
  for each row execute function private.check_username_change();

revoke execute on function private.check_username_change() from public;
