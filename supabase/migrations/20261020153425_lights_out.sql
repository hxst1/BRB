-- Lights Out: juego en solitario por niveles. La puntuación son los niveles
-- superados y `max_tile` guarda las pulsaciones totales. Como el 2048 y el
-- Snake, usa start_run / finish_run y la partida se valida en el servidor.

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check check (game in ('2048', 'snake', 'lightsout'));

comment on column public.game_runs.max_tile is
  'Dato secundario de la partida: ficha más alta en 2048, longitud final en Snake, pulsaciones en Lights Out.';
