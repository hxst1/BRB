"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { GRID, canTurn, newGame, step, tickMs, type Direction, type SnakeState } from "@repo/games/snake";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

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

const SWIPE_THRESHOLD = 20;
const BEST_KEY = "snake:best";
/** Giros que se pueden encadenar antes del siguiente tic (p. ej. dar la vuelta en U). */
const MAX_QUEUED_TURNS = 2;
/** Si el bucle se para (pestaña oculta), al volver no se recuperan los tics perdidos: se pausa. */
const MAX_FRAME_MS = 250;

type Save =
  | { status: "saving" }
  | { status: "saved"; score: number }
  | { status: "rejected" }
  | { status: "error"; message: string };

type Prepared = { game: SnakeState; runId: string | null; notice: string | null };

/** Con sesión, el servidor da la semilla y la partida cuenta; sin ella (o si falla), se juega en local. */
async function prepareGame(signedIn: boolean): Promise<Prepared> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null };
  const { data, error } = await createClient().rpc("start_run", { game: "snake" });
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

export function SnakeGame({ viewerId, onSaved }: { viewerId: string | null; onSaved: () => void }) {
  const signedIn = viewerId !== null;
  const [state, setState] = useState<SnakeState | null>(null);
  const [running, setRunning] = useState(false);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const runId = useRef<string | null>(null);
  const game = useRef<SnakeState | null>(null);
  const queue = useRef<Direction[]>([]);

  const apply = useCallback((next: Prepared) => {
    runId.current = next.runId;
    game.current = next.game;
    queue.current = [];
    setStoredBest(readBest());
    setNotice(next.notice);
    setSave(null);
    setRunning(false);
    setState(next.game);
  }, []);

  const restart = useCallback(async () => apply(await prepareGame(signedIn)), [apply, signedIn]);

  // Como en el 2048: los dos montajes de desarrollo comparten la misma petición.
  const initialGame = useRef<{ key: boolean; promise: Promise<Prepared> } | null>(null);
  useEffect(() => {
    if (initialGame.current?.key !== signedIn) {
      initialGame.current = { key: signedIn, promise: prepareGame(signedIn) };
    }
    let cancelled = false;
    initialGame.current.promise.then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, signedIn]);

  /** Encola un giro; la primera dirección pulsada arranca la partida. */
  const press = useCallback((direction: Direction) => {
    const current = game.current;
    if (!current || current.over) return;
    setRunning(true);
    if (queue.current.length < MAX_QUEUED_TURNS) queue.current.push(direction);
  }, []);

  // Bucle del juego: avanza un tic cada tickMs (acelera con las manzanas).
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let pending = 0;

    const loop = (now: number) => {
      const elapsed = now - last;
      last = now;
      pending += elapsed > MAX_FRAME_MS ? 0 : elapsed;

      let current = game.current;
      while (current && !current.over && pending >= tickMs(current.apples)) {
        pending -= tickMs(current.apples);
        // Se descartan los giros que ya no valen (hacia atrás o repetidos).
        let turn: Direction | undefined;
        while (queue.current.length > 0 && !turn) {
          const candidate = queue.current.shift()!;
          if (canTurn(current, candidate)) turn = candidate;
        }
        current = step(current, turn);
      }
      if (current && current !== game.current) {
        game.current = current;
        setState(current);
      }
      if (current && !current.over) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  // Teclado
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
      const direction = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!direction) return;
      event.preventDefault();
      press(direction);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  // Deslizar: el giro se lanza en cuanto el dedo recorre lo suficiente, sin esperar a soltar.
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    swipeOrigin.current = { x: event.clientX, y: event.clientY };
  }, []);
  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const origin = swipeOrigin.current;
      if (!origin) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
      press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
      swipeOrigin.current = { x: event.clientX, y: event.clientY };
    },
    [press],
  );
  const endSwipe = useCallback(() => (swipeOrigin.current = null), []);

  // Récord local (por dispositivo; el oficial es el del ranking)
  const best = Math.max(storedBest, state?.score ?? 0);
  useEffect(() => {
    if (best > storedBest) writeBest(best);
  }, [best, storedBest]);

  // Al chocar, enviar los giros para que el servidor valide la puntuación.
  const over = state?.over ?? false;
  useEffect(() => {
    const id = runId.current;
    if (!over || !id || !state) return;
    runId.current = null;
    setSave({ status: "saving" });

    fetch(`/api/runs/${id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moves: state.turns }),
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
          onClick={() => void restart()}
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
        >
          Nueva partida
        </button>
      </div>

      {state ? (
        <div
          className="relative touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
        >
          <Board state={state} />
          {!running && !state.over && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <p className="rounded-full bg-bg/85 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                Pulsa una flecha o desliza para empezar
              </p>
            </div>
          )}
          {state.over && <GameOver state={state} save={save} signedIn={signedIn} onRestart={() => void restart()} />}
        </div>
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-[22px]" style={{ background: "var(--board)" }} />
      )}

      <p aria-live="polite" className="sr-only">
        {state?.over ? `Partida terminada con ${state.score} puntos` : ""}
      </p>

      {notice && <p className="text-sm text-muted">{notice}</p>}

      {!signedIn && (
        <p className="text-sm text-muted">
          Estás jugando sin cuenta.{" "}
          <Link href="/entrar?next=/snake" className="font-medium text-ink underline underline-offset-4">
            Entra
          </Link>{" "}
          para que tus partidas cuenten en el ranking.
        </p>
      )}

      <p className="hidden text-sm text-muted sm:block">Usa las flechas o W A S D. En el móvil, desliza.</p>
    </section>
  );
}

/** Tablero en SVG: una unidad por casilla. */
function Board({ state }: { state: SnakeState }) {
  const head = state.body[0]!;
  const eyes = EYES[state.direction];
  return (
    <svg
      viewBox={`-0.25 -0.25 ${GRID + 0.5} ${GRID + 0.5}`}
      role="img"
      aria-label={`Serpiente de ${state.body.length} casillas`}
      className="block aspect-square w-full rounded-[22px]"
      style={{ background: "var(--board)" }}
    >
      {Array.from({ length: GRID * GRID }, (_, cell) => (
        <rect key={cell} x={(cell % GRID) + 0.06} y={Math.floor(cell / GRID) + 0.06} width={0.88} height={0.88} rx={0.2} fill="var(--cell)" />
      ))}
      {state.food !== null && (
        <circle cx={(state.food % GRID) + 0.5} cy={Math.floor(state.food / GRID) + 0.5} r={0.36} fill="var(--t64)" />
      )}
      {state.body.map((cell, i) => (
        <rect
          key={i}
          x={(cell % GRID) + 0.04}
          y={Math.floor(cell / GRID) + 0.04}
          width={0.92}
          height={0.92}
          rx={i === 0 ? 0.32 : 0.22}
          fill={i === 0 ? "var(--t1024)" : "var(--t512)"}
          opacity={state.over && i === 0 ? 0.6 : 1}
        />
      ))}
      {eyes.map(([dx, dy], i) => (
        <circle key={i} cx={(head % GRID) + dx} cy={Math.floor(head / GRID) + dy} r={0.1} fill="var(--t-high)" />
      ))}
    </svg>
  );
}

/** Posición de los ojos dentro de la casilla de la cabeza según hacia dónde mira. */
const EYES: Record<Direction, [number, number][]> = {
  right: [
    [0.68, 0.32],
    [0.68, 0.68],
  ],
  left: [
    [0.32, 0.32],
    [0.32, 0.68],
  ],
  up: [
    [0.32, 0.32],
    [0.68, 0.32],
  ],
  down: [
    [0.32, 0.68],
    [0.68, 0.68],
  ],
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="tabular display text-4xl font-bold">{formatNumber(value)}</span>
    </div>
  );
}

function GameOver({
  state,
  save,
  signedIn,
  onRestart,
}: {
  state: SnakeState;
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
        <p className="text-muted">{state.food === null ? "¡Has llenado el tablero!" : "Te has chocado"}</p>
        <p className="tabular display text-6xl font-bold">{formatNumber(state.score)}</p>
        <p className="text-sm text-muted">
          {state.apples === 1 ? "1 manzana" : `${state.apples} manzanas`}, {state.body.length} casillas de largo
        </p>
        {message && <p className="mt-1 text-sm">{message}</p>}
        <button type="button" onClick={onRestart} className="mt-3 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          Otra partida
        </button>
      </div>
    </div>
  );
}
