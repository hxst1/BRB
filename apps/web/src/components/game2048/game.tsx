"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { maxTile, move, newGame, type Direction, type Game2048State } from "@repo/games/2048";
import { createClient } from "@/lib/supabase/client";
import { Board } from "./board";

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

const SWIPE_THRESHOLD = 24;
const BEST_KEY = "2048:best";

type Save =
  | { status: "saving" }
  | { status: "saved"; score: number }
  | { status: "rejected" }
  | { status: "error"; message: string };

/**
 * Con sesión, el servidor da la semilla y la partida cuenta para el ranking.
 * Sin sesión (o si falla), se juega en local con una semilla aleatoria.
 */
type PreparedGame = { game: Game2048State; runId: string | null; notice: string | null };

async function prepareGame(signedIn: boolean): Promise<PreparedGame> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null };

  const { data, error } = await createClient().rpc("start_run", { game: "2048" });
  const run = data?.[0];
  if (run) return { game: newGame(run.seed), runId: run.id, notice: null };

  return {
    game: newGame(randomSeed()),
    runId: null,
    notice:
      error?.hint === "rate_limited"
        ? "Has empezado muchas partidas seguidas. Esta no contará para el ranking."
        : "No hemos podido conectar. Esta partida no contará para el ranking.",
  };
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Sin almacenamiento (modo privado): el récord local simplemente no se guarda.
  }
}

export function Game2048({ signedIn, onSaved }: { signedIn: boolean; onSaved: () => void }) {
  const [state, setState] = useState<Game2048State | null>(null);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const runId = useRef<string | null>(null);

  const apply = useCallback((next: PreparedGame) => {
    runId.current = next.runId;
    setStoredBest(readBest());
    setNotice(next.notice);
    setSave(null);
    setState(next.game);
  }, []);

  const start = useCallback(async () => apply(await prepareGame(signedIn)), [apply, signedIn]);

  useEffect(() => {
    // En desarrollo React monta dos veces: se ignora la primera partida (el
    // servidor ya la marca como abandonada al empezar la segunda).
    let cancelled = false;
    prepareGame(signedIn).then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, signedIn]);

  const play = useCallback((direction: Direction) => {
    setState((current) => (current && !current.over ? move(current, direction) : current));
  }, []);

  // Teclado
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
      const direction = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!direction) return;
      event.preventDefault();
      play(direction);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play]);

  // Deslizar con el dedo o arrastrando con el ratón
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    swipeOrigin.current = { x: event.clientX, y: event.clientY };
  }, []);

  useEffect(() => {
    const up = (event: PointerEvent) => {
      const origin = swipeOrigin.current;
      swipeOrigin.current = null;
      if (!origin) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
      play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };
    const cancel = () => (swipeOrigin.current = null);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [play]);

  // Récord local (por dispositivo; el oficial es el del ranking)
  const best = Math.max(storedBest, state?.score ?? 0);
  useEffect(() => {
    if (best > storedBest) writeBest(best);
  }, [best, storedBest]);

  // Al terminar, enviar los movimientos para que el servidor valide la puntuación.
  const over = state?.over ?? false;
  useEffect(() => {
    const id = runId.current;
    if (!over || !id || !state) return;
    runId.current = null;
    setSave({ status: "saving" });

    fetch(`/api/runs/${id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moves: state.moves }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          setSave({ status: "saved", score: body.score });
          onSaved();
        } else if (response.status === 422) {
          setSave({ status: "rejected" });
        } else {
          setSave({ status: "error", message: body.error ?? "No se pudo guardar la partida." });
        }
      })
      .catch(() => setSave({ status: "error", message: "Sin conexión: la partida no se ha guardado." }));
  }, [over, state, onSaved]);

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label="Puntos" value={state?.score ?? 0} />
          <Stat label="Tu récord" value={best} />
        </div>
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
        >
          Nueva partida
        </button>
      </div>

      {state ? (
        <Board state={state} onPointerDown={onPointerDown}>
          {state.over && (
            <GameOver state={state} save={save} signedIn={signedIn} onRestart={() => void start()} />
          )}
        </Board>
      ) : (
        <div className="board animate-pulse" />
      )}

      <p aria-live="polite" className="sr-only">
        {state?.over ? `Partida terminada con ${state.score} puntos` : ""}
      </p>

      {notice && <p className="text-sm text-muted">{notice}</p>}

      {!signedIn && (
        <p className="text-sm text-muted">
          Estás jugando sin cuenta.{" "}
          <Link href="/entrar?next=/2048" className="font-medium text-ink underline underline-offset-4">
            Entra
          </Link>{" "}
          para que tus partidas cuenten en el ranking.
        </p>
      )}

      <p className="hidden text-sm text-muted sm:block">Usa las flechas o W A S D. En el móvil, desliza.</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="tabular display text-4xl font-bold">{value}</span>
    </div>
  );
}

function GameOver({
  state,
  save,
  signedIn,
  onRestart,
}: {
  state: Game2048State;
  save: Save | null;
  signedIn: boolean;
  onRestart: () => void;
}) {
  const message = !signedIn
    ? "Sin cuenta, esta partida no entra en el ranking."
    : save?.status === "saving"
      ? "Guardando…"
      : save?.status === "saved"
        ? "Guardada en el ranking."
        : save?.status === "rejected"
          ? "No hemos podido validar esta partida, así que no cuenta."
          : save?.status === "error"
            ? save.message
            : null;

  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-[22px] bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <p className="text-muted">Sin movimientos</p>
        <p className="tabular display text-6xl font-bold">{state.score}</p>
        <p className="text-sm text-muted">Ficha más alta: {maxTile(state)}</p>
        {message && <p className="mt-1 text-sm">{message}</p>}
        <button
          type="button"
          onClick={onRestart}
          className="mt-3 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
        >
          Otra partida
        </button>
      </div>
    </div>
  );
}
