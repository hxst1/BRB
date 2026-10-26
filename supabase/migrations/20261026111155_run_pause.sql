-- Pausa en los juegos por tiempo (buscaminas, sudoku y solitario): el tiempo
-- oficial es el transcurrido desde que empezó la partida menos las pausas.
--
--   paused_ms  pausas ya terminadas, en milisegundos
--   paused_at  si está en pausa ahora, desde cuándo
--
-- La app pausa al pulsar el botón, al cambiar de app o de pestaña y al salir
-- del juego; mientras dura, tapa el tablero. Al terminar, el servidor descuenta
-- también la pausa en curso (app/api/runs/[id]/finish).

alter table public.game_runs
  add column paused_ms bigint not null default 0 check (paused_ms >= 0),
  add column paused_at timestamptz;

create function public.pause_run(run_id uuid)
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
    and private.lower_is_better(r.game);
$$;

create function public.resume_run(run_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.game_runs r
  set paused_ms = r.paused_ms + round(extract(epoch from now() - r.paused_at) * 1000)::bigint,
      paused_at = null
  where r.id = resume_run.run_id
    and r.user_id = auth.uid()
    and r.status = 'playing'
    and r.paused_at is not null;
$$;

revoke execute on function public.pause_run(uuid) from public, anon, authenticated;
revoke execute on function public.resume_run(uuid) from public, anon, authenticated;
grant execute on function public.pause_run(uuid) to authenticated;
grant execute on function public.resume_run(uuid) to authenticated;
