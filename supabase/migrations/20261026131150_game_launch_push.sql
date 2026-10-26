-- Aviso por notificación de cada juego nuevo a quien tiene las notificaciones
-- activadas. Los juegos y su fecha de salida están en el código (lib/seo.ts,
-- addedAt), así que la base de datos solo pide a la app que mire: cada hora,
-- de 10:00 a 21:59 en España (no de madrugada). La app avisa de los juegos
-- de los últimos días que aún no estén aquí, apuntándolos antes de enviar
-- para que ninguno salga dos veces (app/api/push/dispatch, lib/launches.ts).

create table public.game_launches (
  game text primary key check (game ~ '^[a-z0-9-]{1,30}$'),
  announced_at timestamptz not null default now()
);

comment on table public.game_launches is 'Juegos nuevos ya anunciados por notificación. Solo la usa el servidor.';

alter table public.game_launches enable row level security;
revoke all on public.game_launches from anon, authenticated;

-- Los juegos que ya estaban antes de esto no se anuncian (salvo los de hoy).
insert into public.game_launches (game)
select unnest(array[
  '2048', 'snake', 'lights-out', 'minesweeper', 'sudoku', 'wordle',
  'tictactoe', 'connect4', 'battleship', 'rps', 'pong', 'tron', 'chess'
]);

create function private.check_game_launches(at timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if extract(hour from at at time zone 'Europe/Madrid') not between 10 and 21 then
    return false;
  end if;
  perform private.post_push(jsonb_build_object('table', 'launches', 'type', 'CHECK'));
  return true;
end;
$$;

revoke execute on function private.check_game_launches(timestamptz) from public;

select cron.schedule('game-launches', '5 * * * *', 'select private.check_game_launches()');
