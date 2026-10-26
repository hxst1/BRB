-- Solitario (Klondike, robando de una en una): otro juego en solitario con
-- ranking. Como en el sudoku, la puntuación es el tiempo en milisegundos que
-- mide el servidor y gana el menor. `max_tile` guarda los movimientos.

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check
  check (game in ('2048', 'snake', 'lightsout', 'minesweeper-easy', 'minesweeper-medium', 'minesweeper-hard',
                  'sudoku-easy', 'sudoku-medium', 'sudoku-hard', 'solitaire'));

comment on column public.game_runs.max_tile is
  'Dato secundario de la partida: ficha más alta en 2048, longitud final en Snake, pulsaciones en Lights Out, casillas abiertas en el buscaminas, casillas rellenadas en el sudoku, movimientos en el solitario.';

create or replace function private.lower_is_better(game text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select game like 'minesweeper-%' or game like 'sudoku-%' or game = 'solitaire';
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
    else private.xp_for_score(score)
  end;
$$;
