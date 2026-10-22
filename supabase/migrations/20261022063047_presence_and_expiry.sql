-- Presencia y caducidad de los retos.
--
-- Presencia: mientras la app está a la vista, cada pocos segundos dice en qué
-- pantalla está el usuario. El servidor de avisos no manda el de una partida
-- o un chat a quien lo está mirando en ese momento (en iPhone no se puede
-- ocultar una notificación que ya ha llegado: hay que no mandarla).
--
-- Caducidad: un reto sin respuesta en 3 días se retira solo (pg_cron).

-- ---------------------------------------------------------------------------
-- Presencia
-- ---------------------------------------------------------------------------

create table public.presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Ruta de la pantalla a la vista (p. ej. /4-en-raya/<id>), o null si no hay ninguna.
  path text check (char_length(path) <= 200),
  seen_at timestamptz not null default now()
);

-- Nadie la lee desde el cliente: solo el servidor de avisos.
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

-- Ruta vacía: la app está oculta (no hay ninguna pantalla a la vista).
create function public.set_presence(path text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.presence (user_id, path, seen_at)
  select auth.uid(), nullif(set_presence.path, ''), now()
  where auth.uid() is not null
  on conflict (user_id) do update set path = excluded.path, seen_at = excluded.seen_at;
$$;

revoke execute on function public.set_presence(text) from public, anon, authenticated;
grant execute on function public.set_presence(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Caducidad de los retos
-- ---------------------------------------------------------------------------

-- Retira los retos pendientes de hace más de 3 días. Al cambiar el estado, el
-- trigger de avisos se entera y avisa a quien retó. Devuelve cuántos.
create function private.expire_challenges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired integer;
begin
  update public.matches m
  set status = 'cancelled', updated_at = now()
  where m.status = 'pending' and m.created_at < now() - interval '3 days';
  get diagnostics expired = row_count;
  return expired;
end;
$$;

revoke execute on function private.expire_challenges() from public;

select cron.schedule('expire-challenges', '20 * * * *', 'select private.expire_challenges()');
