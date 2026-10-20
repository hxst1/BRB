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
    if tg_op = 'UPDATE' and old.supporter_tier is not null then
      -- Al dejar de ser supporter se le quitan las partes exclusivas en vez de
      -- bloquear el cambio (las listas siguen viviendo solo en is_supporter_avatar).
      new.avatar_parts := new.avatar_parts
        - (case when private.is_supporter_avatar(jsonb_build_object('palette', new.avatar_parts -> 'palette')) then 'palette' else '' end)
        - (case when private.is_supporter_avatar(jsonb_build_object('top', new.avatar_parts -> 'top')) then 'top' else '' end);
    else
      raise exception 'Esa parte del avatar es exclusiva de supporters'
        using errcode = 'P0001', hint = 'supporter_only';
    end if;
  end if;
  return new;
end;
$$;

create trigger check_supporter_avatar
  before insert or update of avatar_parts, supporter_tier on public.profiles
  for each row execute function private.check_supporter_avatar();
