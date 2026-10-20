import { useCallback, useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { maxTile, move, newGame, type Direction, type Game2048State } from "@repo/games/2048";
import { Board } from "@repo/ui/board-2048";
import { SITE_URL } from "@/lib/env";
import { supabase } from "@/lib/supabase";

const KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

type Save = "saving" | "saved" | "rejected" | "error" | null;

/**
 * 2048 en el popup. Igual que en la web: el servidor da la semilla y al
 * terminar valida los movimientos (con el token de la sesión de la extensión).
 */
export function QuickGame({ accessToken }: { accessToken: string }) {
  const [state, setState] = useState<Game2048State | null>(null);
  const [save, setSave] = useState<Save>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef<string | null>(null);
  const starting = useRef<Promise<void> | null>(null);

  const start = useCallback(async () => {
    setSave(null);
    setError(null);
    const { data, error: startError } = await supabase().rpc("start_run", { game: "2048" });
    const run = data?.[0];
    if (!run) {
      setError(startError?.hint === "rate_limited" ? "Has empezado muchas partidas seguidas. Descansa un poco." : "No hemos podido empezar la partida.");
      return;
    }
    runId.current = run.id;
    setState(newGame(run.seed));
  }, []);

  useEffect(() => {
    // Una sola partida aunque React monte dos veces en desarrollo.
    starting.current ??= start();
  }, [start]);

  const play = useCallback((direction: Direction) => {
    setState((current) => (current && !current.over ? move(current, direction) : current));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const direction = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!direction) return;
      event.preventDefault();
      play(direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play]);

  const over = state?.over ?? false;
  useEffect(() => {
    const id = runId.current;
    if (!over || !id || !state) return;
    runId.current = null;
    setSave("saving");
    fetch(new URL(`/api/runs/${id}/finish`, SITE_URL), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ moves: state.moves }),
    })
      .then((response) => {
        setSave(response.ok ? "saved" : response.status === 422 ? "rejected" : "error");
        void browser.runtime.sendMessage("refresh-badge").catch(() => undefined);
      })
      .catch(() => setSave("error"));
  }, [over, state, accessToken]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted">Puntos</span>
          <span className="tabular display text-3xl font-bold">{state?.score ?? 0}</span>
        </div>
        <button type="button" onClick={() => void start()} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium">
          Nueva partida
        </button>
      </div>

      {state ? (
        <Board state={state}>
          {state.over && (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-[22px] bg-bg/85 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                <p className="text-sm text-muted">Sin movimientos · ficha {maxTile(state)}</p>
                <p className="tabular display text-5xl font-bold">{state.score}</p>
                <p className="text-sm">
                  {save === "saving" && "Guardando…"}
                  {save === "saved" && "Guardada en el ranking."}
                  {save === "rejected" && "No se ha podido validar."}
                  {save === "error" && "No se ha podido guardar."}
                </p>
                <button type="button" onClick={() => void start()} className="mt-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
                  Otra partida
                </button>
              </div>
            </div>
          )}
        </Board>
      ) : (
        <div className="board animate-pulse" />
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted">Flechas o W A S D</p>
    </div>
  );
}
