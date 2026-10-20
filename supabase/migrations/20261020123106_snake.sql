-- Snake: juego en solitario con puntuación, como el 2048. Usa las mismas
-- partidas (start_run / finish_run validadas en el servidor), así que entra
-- solo en el ranking, da XP y cuenta para la racha.
--
-- En las partidas de Snake, `max_tile` guarda la longitud final de la serpiente.

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check check (game in ('2048', 'snake'));

comment on column public.game_runs.max_tile is 'Dato secundario de la partida: ficha más alta en 2048, longitud final en Snake.';
