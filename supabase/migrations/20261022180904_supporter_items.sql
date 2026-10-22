-- Más partes exclusivas para quien apoya: colores arcoíris y galaxia y gafas de sol.
-- Debe coincidir con las partes `supporter: true` de packages/avatars (lo comprueba su test).

create or replace function private.is_supporter_avatar(parts jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(parts ->> 'palette' in ('gold', 'night', 'rainbow', 'galaxy'), false)
      or coalesce(parts ->> 'top' in ('crown', 'sunglasses'), false);
$$;
