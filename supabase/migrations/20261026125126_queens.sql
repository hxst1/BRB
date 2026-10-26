-- Reinas: tres juegos en solitario (uno por tamaño de tablero, cada uno con
-- su ranking). Como en el sudoku, la puntuación es el tiempo en milisegundos
-- que mide el servidor (sin las pausas) y gana el menor. `max_tile` guarda el
-- número de reinas.

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check
  check (game in ('2048', 'snake', 'lightsout', 'minesweeper-easy', 'minesweeper-medium', 'minesweeper-hard',
                  'sudoku-easy', 'sudoku-medium', 'sudoku-hard', 'solitaire',
                  'queens-easy', 'queens-medium', 'queens-hard'));

comment on column public.game_runs.max_tile is
  'Dato secundario de la partida: ficha más alta en 2048, longitud final en Snake, pulsaciones en Lights Out, casillas abiertas en el buscaminas, casillas rellenadas en el sudoku, movimientos en el solitario, reinas en Reinas.';

create or replace function private.lower_is_better(game text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select game like 'minesweeper-%' or game like 'sudoku-%' or game = 'solitaire' or game like 'queens-%';
$$;

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
    else private.xp_for_score(score)
  end;
$$;
