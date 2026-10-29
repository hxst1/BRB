-- Parejas: juego en solitario con cartas boca abajo (10 parejas de monstruos).
-- La puntuación son puntos (gana el mayor) y `max_tile` guarda los fallos.
--
-- A diferencia de los demás, el navegador no conoce la partida: con la semilla
-- se resolvería sin fallar. El servidor de Next calcula el tablero con un
-- secreto, enseña cada carta al girarla y apunta los giros en `moves` con
-- record_pairs_flip (solo service_role). Al terminar, la partida se valida con
-- esos giros, no con lo que diga el cliente: mirar cartas por fuera cuenta.

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check
  check (game in ('2048', 'snake', 'lightsout', 'minesweeper-easy', 'minesweeper-medium', 'minesweeper-hard',
                  'sudoku-easy', 'sudoku-medium', 'sudoku-hard', 'solitaire',
                  'queens-easy', 'queens-medium', 'queens-hard', 'pairs'));

comment on column public.game_runs.max_tile is
  'Dato secundario de la partida: ficha más alta en 2048, longitud final en Snake, pulsaciones en Lights Out, casillas abiertas en el buscaminas, casillas rellenadas en el sudoku, movimientos en el solitario, reinas en Reinas, fallos en Parejas.';

create or replace function private.xp_for_run(game text, score integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case game
    when 'minesweeper-easy' then 3
    when 'minesweeper-medium' then 8
    when 'minesweeper-hard' then 20
    when 'sudoku-easy' then 6
    when 'sudoku-medium' then 12
    when 'sudoku-hard' then 25
    when 'solitaire' then 10
    when 'queens-easy' then 4
    when 'queens-medium' then 8
    when 'queens-hard' then 15
    when 'pairs' then 6
    else private.xp_for_score(score)
  end;
$$;

-- Apunta un giro de una partida de Parejas en curso. `previous_count` son los
-- giros que el servidor ya tenía al validarlo: si entre medias ha entrado otro
-- (dos peticiones a la vez), no se apunta y devuelve false.
create function public.record_pairs_flip(run_id uuid, previous_count integer, flip text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with recorded as (
    update public.game_runs r
    set moves = coalesce(r.moves, '') || record_pairs_flip.flip
    where r.id = record_pairs_flip.run_id
      and r.game = 'pairs'
      and r.status = 'playing'
      and coalesce(char_length(r.moves), 0) = record_pairs_flip.previous_count
      and record_pairs_flip.flip ~ '^[0-9a-j]$'
    returning 1
  )
  select exists (select 1 from recorded);
$$;

revoke execute on function public.record_pairs_flip(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.record_pairs_flip(uuid, integer, text) to service_role;
