"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { GRID, canTurn, newGame, step, tickMs, type Direction, type SnakeState } from "@repo/games/snake";
import { startRun, type RunNotice } from "@/lib/start-run";
import { GuestNotice } from "@/components/guest-notice";
import { useSwipeLock } from "@/components/swipe-lock";
import { ShareStory } from "@/components/share-story";
import { useMessages } from "@/lib/i18n/client";

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
  | { status: "saved"; score: number; runId: string }
  | { status: "rejected" }
  | { status: "error"; message: string };

type Prepared = { game: SnakeState; runId: string | null; notice: RunNotice | null };

/**
 * Con sesión, el servidor da la semilla y la partida cuenta (también la del
 * reto diario, con `daily`); sin ella (o si falla), se juega en local.
 */
async function prepareGame(signedIn: boolean, daily: boolean): Promise<Prepared> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null };
  const { run, notice } = await startRun("snake", daily);
  return run ? { game: newGame(run.seed), runId: run.id, notice: null } : { game: newGame(randomSeed()), runId: null, notice };
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

export function SnakeGame({
  viewerId,
  onSaved,
  daily = null,
}: {
  viewerId: string | null;
  onSaved: () => void;
  /** Día del reto diario (AAAA-MM-DD) si se juega el reto. */
  daily?: string | null;
}) {
  const m = useMessages();
  const signedIn = viewerId !== null;
  const [state, setState] = useState<SnakeState | null>(null);
  const [running, setRunning] = useState(false);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const runId = useRef<string | null>(null);
  const game = useRef<SnakeState | null>(null);
  const queue = useRef<Direction[]>([]);
  /** Cuánto se ha avanzado hacia el siguiente tic (0-1), para dibujar el movimiento suave. */
  const progress = useRef(0);

  const apply = useCallback((next: Prepared) => {
    runId.current = next.runId;
    game.current = next.game;
    queue.current = [];
    progress.current = 0;
    setStoredBest(readBest());
    setNotice(next.notice);
    setSave(null);
    setRunning(false);
    setState(next.game);
  }, []);

  const restart = useCallback(async () => apply(await prepareGame(signedIn, daily !== null)), [apply, signedIn, daily]);

  // Como en el 2048: los dos montajes de desarrollo comparten la misma petición.
  const initialGame = useRef<{ key: boolean; promise: Promise<Prepared> } | null>(null);
  useEffect(() => {
    if (initialGame.current?.key !== signedIn) {
      initialGame.current = { key: signedIn, promise: prepareGame(signedIn, daily !== null) };
    }
    let cancelled = false;
    initialGame.current.promise.then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, signedIn, daily]);

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
      progress.current = current && !current.over ? pending / tickMs(current.apples) : 0;
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

  // En marcha, la página no se mueve y se puede deslizar en cualquier sitio de la pantalla.
  const playing = running && !(state?.over ?? false);
  useSwipeLock(playing, press, SWIPE_THRESHOLD);

  // Al empezar, el tablero entero a la vista.
  const board = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (playing) board.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [playing]);

  // Deslizar sobre el tablero (para empezar, y con el ratón): el giro se lanza en
  // cuanto el dedo recorre lo suficiente, sin esperar a soltar.
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (event.target instanceof Element && event.target.closest("button, a")) return;
      // Con la partida en marcha, los toques los recoge useSwipeLock (en toda la pantalla).
      if (playing && event.pointerType !== "mouse") return;
      swipeOrigin.current = { x: event.clientX, y: event.clientY };
    },
    [playing],
  );
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
          setSave({ status: "saved", score: body.score, runId: id });
          onSaved();
        } else if (response.status === 422) {
          setSave({ status: "rejected" });
        } else {
          setSave({ status: "error", message: body.error ?? m.run.saveError });
        }
      })
      .catch(() => setSave({ status: "error", message: m.run.offlineSave }));
  }, [over, state, onSaved, m]);

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={m.run.points} value={state?.score ?? 0} />
          <Stat label={m.run.yourRecord} value={best} />
        </div>
        {/* En el reto diario hay un solo intento. */}
        {daily === null && (
          <button
            type="button"
            onClick={() => void restart()}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            {m.run.newGame}
          </button>
        )}
      </div>

      {state ? (
        <div
          ref={board}
          className="relative touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
        >
          <SnakeCanvas game={game} queue={queue} progress={progress} length={state.body.length} />
          {!running && !state.over && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <p className="rounded-full bg-bg/85 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                {m.snake.start}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-[22px]" style={{ background: "var(--board)" }} />
      )}

      {/* Cruceta en pantallas táctiles, para quien prefiera botones a deslizar. */}
      {state && !state.over && <DPad onPress={press} />}

      {state?.over && <GameOver state={state} save={save} signedIn={signedIn} onRestart={daily === null ? () => void restart() : undefined} />}

      <p aria-live="polite" className="sr-only">
        {state?.over ? m.game2048.overAria(state.score) : ""}
      </p>

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}

      {!signedIn && <GuestNotice next="/snake" />}

      <p className="hidden text-sm text-muted sm:block">{m.game2048.controls}</p>
    </section>
  );
}

/**
 * Tablero en canvas a la frecuencia de la pantalla. La lógica avanza por
 * casillas, pero aquí cada cuadrado se desliza entre el estado actual y el
 * siguiente (con el giro que haya en cola), así que se ve fluido.
 */
function SnakeCanvas({
  game,
  queue,
  progress,
  length,
}: {
  game: React.RefObject<SnakeState | null>;
  queue: React.RefObject<Direction[]>;
  progress: React.RefObject<number>;
  length: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const state = game.current;
      if (state && canvas.current) drawSnake(canvas.current, state, nextTurn(state, queue.current), progress.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [game, queue, progress]);

  const m = useMessages();
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={m.snake.aria(length)}
      className="block aspect-square w-full rounded-[22px]"
      style={{ background: "var(--board)" }}
    />
  );
}

/** Primer giro de la cola que se podrá aplicar en el próximo tic. */
function nextTurn(state: SnakeState, queued: Direction[]): Direction | undefined {
  return queued.find((direction) => canTurn(state, direction));
}

type Point = { x: number; y: number };
const center = (cell: number): Point => ({ x: (cell % GRID) + 0.5, y: Math.floor(cell / GRID) + 0.5 });
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function drawSnake(canvas: HTMLCanvasElement, state: SnakeState, turn: Direction | undefined, progress: number) {
  const ratio = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  if (canvas.width !== Math.round(size * ratio)) {
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const styles = getComputedStyle(canvas);
  const color = (name: string) => styles.getPropertyValue(name).trim();
  // Un margen de un cuarto de casilla alrededor, como antes.
  const unit = size / (GRID + 0.5);
  ctx.setTransform(ratio * unit, 0, 0, ratio * unit, ratio * unit * 0.25, ratio * unit * 0.25);
  ctx.clearRect(-0.25, -0.25, GRID + 0.5, GRID + 0.5);

  const square = (p: Point, inset: number, radius: number) => {
    ctx.beginPath();
    ctx.roundRect(p.x - 0.5 + inset, p.y - 0.5 + inset, 1 - inset * 2, 1 - inset * 2, radius);
    ctx.fill();
  };

  // Cuadrícula
  ctx.fillStyle = color("--cell");
  for (let cell = 0; cell < GRID * GRID; cell++) square(center(cell), 0.06, 0.2);

  // Manzana
  if (state.food !== null) {
    const p = center(state.food);
    ctx.fillStyle = color("--t64");
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cada cuadrado se desliza de su casilla actual a la que ocupará en el
  // siguiente tic; si el siguiente paso choca, se queda quieta.
  const next = step(state, turn);
  const t = state.over || next.over ? 0 : Math.min(progress, 1);
  const segments = state.body.map((cell, i) => lerp(center(cell), center(next.body[i]!), t));

  ctx.fillStyle = color("--t512");
  for (const p of segments.slice(1).reverse()) square(p, 0.04, 0.22);

  const head = segments[0]!;
  ctx.globalAlpha = state.over ? 0.6 : 1;
  ctx.fillStyle = color("--t1024");
  square(head, 0.04, 0.32);
  ctx.globalAlpha = 1;

  // Ojos, mirando hacia donde va.
  const heading = t > 0 ? next.direction : state.direction;
  const [dx, dy] = heading === "up" ? [0, -1] : heading === "down" ? [0, 1] : heading === "left" ? [-1, 0] : [1, 0];
  ctx.fillStyle = color("--t-high");
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(head.x + dx * 0.18 + dy * side * 0.18, head.y + dy * 0.18 - dx * side * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  const m = useMessages();
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="tabular display text-4xl font-bold">{m.format.number(value)}</span>
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
  /** Sin él (reto diario), no hay "Otra partida". */
  onRestart?: () => void;
}) {
  const m = useMessages();
  const message = !signedIn
    ? m.run.guest
    : save?.status === "saving"
      ? m.common.saving
      : save?.status === "saved"
        ? m.run.saved
        : save?.status === "rejected"
          ? m.run.rejected
          : save?.status === "error"
            ? save.message
            : null;

  return (
    // Debajo del tablero, sin taparlo: así se ve dónde se ha chocado.
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="display text-2xl font-bold">{state.food === null ? m.snake.filled : m.snake.crashed}</p>
        <p className="text-sm text-muted">
          {m.snake.summary(m.format.number(state.score), state.apples)}
        </p>
        {message && <p className="text-sm">{message}</p>}
        {save?.status === "saved" && <ShareStory runId={save.runId} game="snake" />}
      </div>
      {onRestart && (
        <button type="button" onClick={onRestart} className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          {m.run.playAgain}
        </button>
      )}
    </div>
  );
}

const ARROWS: Record<Direction, string> = { up: "M12 6 5 15h14z", down: "M12 18 5 9h14z", left: "M6 12l9-7v14z", right: "M18 12 9 5v14z" };

/** Cruceta: el giro va al tocar (no al soltar), como deslizar. */
function DPad({ onPress }: { onPress: (direction: Direction) => void }) {
  const m = useMessages();
  const button = (direction: Direction, place: string) => (
    <button
      type="button"
      aria-label={m.snake.directions[direction]}
      onPointerDown={(event) => {
        event.preventDefault();
        onPress(direction);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onPress(direction);
      }}
      className={`${place} grid size-16 touch-none place-items-center rounded-2xl bg-surface shadow-soft active:bg-line/60`}
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <path d={ARROWS[direction]} fill="currentColor" />
      </svg>
    </button>
  );
  return (
    <div role="group" aria-label={m.snake.dpad} className="hidden grid-cols-[repeat(3,4rem)] justify-center gap-2 select-none pointer-coarse:grid">
      {button("up", "col-start-2")}
      {button("left", "col-start-1 row-start-2")}
      {button("down", "col-start-2 row-start-2")}
      {button("right", "col-start-3 row-start-2")}
    </div>
  );
}
