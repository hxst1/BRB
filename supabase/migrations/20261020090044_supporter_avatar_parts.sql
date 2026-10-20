-- Las partes de avatar exclusivas de supporter solo las puede llevar un supporter.
-- El cliente puede escribir `avatar_parts` directamente (RLS), así que la regla
-- tiene que vivir aquí y no solo en la interfaz.
-- Debe coincidir con las partes `supporter: true` de packages/avatars.

create function private.is_supporter_avatar(parts jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(parts ->> 'palette' in ('gold', 'night'), false)
      or coalesce(parts ->> 'top' in ('crown'), false);
$$;

-- security definer: el trigger se dispara con el rol del usuario, que no tiene
-- acceso al esquema private.
create function private.check_supporter_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.supporter_tier is null and private.is_supporter_avatar(new.avatar_parts) then
    raise exception 'Esa parte del avatar es exclusiva de supporters'
      using errcode = 'P0001', hint = 'supporter_only';
  end if;
  return new;
end;
$$;

create trigger check_supporter_avatar
  before insert or update of avatar_parts, supporter_tier on public.profiles
  for each row execute function private.check_supporter_avatar();
