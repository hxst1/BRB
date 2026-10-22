-- Juegos fijados: cada usuario elige sus favoritos y le salen primero en la
-- portada, en el orden en que los fijó. Tabla aparte de profiles para que
-- solo los vea su dueño.

create table public.pinned_games (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Id de la tarjeta del juego (2048, sudoku, tron…). La app ignora los que no conozca.
  game text not null check (game ~ '^[a-z0-9-]{1,30}$'),
  pinned_at timestamptz not null default now(),
  primary key (user_id, game)
);

alter table public.pinned_games enable row level security;
revoke all on public.pinned_games from anon, authenticated;
grant select on public.pinned_games to authenticated;

create policy "Cada usuario ve sus juegos fijados"
  on public.pinned_games for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Fija el juego si no lo estaba y lo quita si lo estaba. Como mucho 6.
-- Devuelve si queda fijado.
create function public.toggle_pinned_game(game text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Hace falta iniciar sesión' using errcode = '42501';
  end if;

  delete from public.pinned_games p where p.user_id = me and p.game = toggle_pinned_game.game;
  if found then
    return false;
  end if;

  if (select count(*) from public.pinned_games p where p.user_id = me) >= 6 then
    raise exception 'Como mucho puedes fijar 6 juegos' using errcode = 'P0001';
  end if;
  insert into public.pinned_games (user_id, game) values (me, toggle_pinned_game.game);
  return true;
end;
$$;

revoke execute on function public.toggle_pinned_game(text) from public, anon, authenticated;
grant execute on function public.toggle_pinned_game(text) to authenticated;
