-- Partidas que se retoman: el 2048 y Lights Out se guardan en el navegador al
-- salir y se siguen al volver, como el sudoku. Para eso también se pausan
-- (al cambiar de app o salir del juego): si no, el reloj seguiría corriendo y
-- una partida dejada de un día para otro superaría las 6 horas que acepta el
-- servidor (packages/games, MAX_RUN_DURATION_MS).
--
-- Su puntuación no depende del tiempo: pausar solo descuenta tiempo, lo que
-- hace más estricto el control de ritmo (movimientos por segundo jugado).
-- Snake sigue sin pausa: va en tiempo real.

create or replace function public.pause_run(run_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.game_runs r
  set paused_at = now()
  where r.id = pause_run.run_id
    and r.user_id = auth.uid()
    and r.status = 'playing'
    and r.paused_at is null
    and (private.lower_is_better(r.game) or r.game in ('2048', 'lightsout'));
$$;

revoke execute on function public.pause_run(uuid) from public, anon, authenticated;
grant execute on function public.pause_run(uuid) to authenticated;
