-- Novedades vistas: qué avisos de "juego nuevo" ha visto ya cada usuario.
--
-- Se guarda cada aviso visto (el id del juego), no una fecha: si salen dos
-- juegos en días distintos y no ha visto ninguno, el aviso enseña los dos.
-- La lista de juegos y su fecha de alta viven en apps/web/src/lib/seo.ts.

create table public.seen_announcements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  announcement text not null check (announcement ~ '^[a-z0-9-]{1,40}$'),
  seen_at timestamptz not null default now(),
  primary key (user_id, announcement)
);

alter table public.seen_announcements enable row level security;
revoke all on public.seen_announcements from anon, authenticated;
grant select on public.seen_announcements to authenticated;

create policy "Cada usuario ve sus novedades vistas"
  on public.seen_announcements for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Marca como vistos esos avisos (como mucho 20 de una vez).
create function public.mark_announcements_seen(ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión' using errcode = '42501';
  end if;
  insert into public.seen_announcements (user_id, announcement)
  select auth.uid(), id from unnest(ids[1:20]) id
  on conflict do nothing;
end;
$$;

revoke execute on function public.mark_announcements_seen(text[]) from public, anon, authenticated;
grant execute on function public.mark_announcements_seen(text[]) to authenticated;

-- Quien ya tenía cuenta ya conoce los juegos de ahora: no se le anuncian.
insert into public.seen_announcements (user_id, announcement)
select p.id, g.id
from public.profiles p
cross join unnest(array[
  '2048', 'snake', 'lights-out', 'minesweeper', 'sudoku', 'wordle',
  'tictactoe', 'connect4', 'battleship', 'rps', 'pong', 'tron'
]) g(id)
on conflict do nothing;
