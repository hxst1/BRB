"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Pausa de los juegos por tiempo (buscaminas, sudoku y solitario). El tiempo
 * oficial lo mide el servidor descontando las pausas (migración run_pause),
 * así que cada pausa se le cuenta. Mientras dura, el tablero se tapa.
 */

/** Pausas de una partida: las ya terminadas (ms) y, si está en pausa, desde cuándo. */
export type Pause = { ms: number; since: number | null };
export const NO_PAUSE: Pause = { ms: 0, since: null };

/** Tiempo de juego a la hora `now`: lo transcurrido desde `startedAt` menos las pausas. */
export function playedMs(startedAt: number, now: number, pause: Pause): number {
  return Math.max(0, now - startedAt - pause.ms - (pause.since === null ? 0 : now - pause.since));
}

/** Las pausas que tiene apuntadas el servidor (al retomar una partida). */
export function pauseFromRun(run: { paused_ms: number; paused_at: string | null }): Pause {
  return { ms: run.paused_ms, since: run.paused_at ? new Date(run.paused_at).getTime() : null };
}

export const startPause = (pause: Pause, at: number): Pause => (pause.since === null ? { ...pause, since: at } : pause);

export const endPause = (pause: Pause, at: number): Pause =>
  pause.since === null ? pause : { ms: pause.ms + Math.max(0, at - pause.since), since: null };

/** Se lo cuenta al servidor (si la partida cuenta para el ranking). */
export function reportPause(runId: string | null, paused: boolean) {
  if (!runId) return;
  void createClient()
    .rpc(paused ? "pause_run" : "resume_run", { run_id: runId })
    .then(() => undefined);
}

/**
 * Pausa sola al cambiar de app o de pestaña y, con `onLeave`, al salir del
 * juego (en los que se pueden retomar luego). `pause` no hace nada si no toca.
 */
export function useAutoPause(pause: () => void, { onLeave = false }: { onLeave?: boolean } = {}) {
  const latest = useRef(pause);
  useEffect(() => {
    latest.current = pause;
  });
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") latest.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (onLeave) latest.current();
    };
  }, [onLeave]);
}

/** Botón de pausa, junto al tiempo. */
export function PauseButton({ paused, disabled, onToggle }: { paused: boolean; disabled?: boolean; onToggle: () => void }) {
  const m = useMessages();
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={paused ? m.pause.resume : m.pause.pause}
      aria-pressed={paused}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface shadow-soft transition-colors hover:border-muted disabled:opacity-40"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        {paused ? (
          <path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" fill="currentColor" />
        ) : (
          <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

/**
 * Tapa el tablero durante la pausa (si no, se podría pensar con el reloj
 * parado). Tocarla sigue. Va por encima de las cartas del solitario: el
 * tablero que la contiene tiene que aislar sus capas (`isolate`).
 */
export function PauseCover({ onResume }: { onResume: () => void }) {
  const m = useMessages();
  return (
    <button
      type="button"
      onClick={onResume}
      className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-1 rounded-[18px] bg-bg/95 backdrop-blur-xl"
    >
      <span className="display text-4xl font-bold">{m.pause.paused}</span>
      <span className="text-sm text-muted">{m.pause.tapToResume}</span>
    </button>
  );
}
