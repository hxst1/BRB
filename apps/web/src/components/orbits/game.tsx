"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomSeed } from "@repo/games";
import {
  BALL_RADIUS,
  BALL_SPEED,
  CORE_RADIUS,
  FULL_TURN,
  LAUNCH_ANGLE,
  LIVES,
  RING_WIDTH,
  START_RADIUS,
  TICK_MS,
  canLaunch,
  newGame,
  ringAngle,
  step,
  type OrbitsState,
} from "@repo/games/orbits";
import { playSound } from "@/lib/sound";
import { useMessages } from "@/lib/i18n/client";
import { ORBITS_GAMES_KEY } from "@/components/feedback/game-rating-prompt";
import { reportGameFinished } from "@/lib/game-rating";

/**
 * Órbitas, en pruebas: se juega en local, sin partida en el servidor ni
 * ranking (eso, si el juego se queda; la lógica ya permite validarlas). Las
 * partidas se cuentan en el dispositivo, para preguntar qué le parece (ver
 * GameRatingPrompt).
 */

const BEST_KEY = "orbits:best";
/** Si el bucle se para (pestaña oculta), al volver no se recuperan los tics perdidos. */
const MAX_FRAME_MS = 250;
/** Un color por anillo, de fuera adentro. */
const RING_COLORS = ["--t1024", "--t2048", "--t256", "--t32", "--t512"];

type Hud = Pick<OrbitsState, "level" | "lives" | "score" | "status" | "seed">;
const hudOf = ({ level, lives, score, status, seed }: OrbitsState): Hud => ({ level, lives, score, status, seed });

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

export function OrbitsGame({ viewerId }: { viewerId: string | null }) {
  const m = useMessages();
  const t = m.orbits;
  const game = useRef<OrbitsState | null>(null);
  /** Lanzamiento pedido, para el próximo tic. */
  const launch = useRef(false);
  /** Cuánto se ha avanzado hacia el siguiente tic (0-1), para dibujar el movimiento suave. */
  const progress = useRef(0);
  const [hud, setHud] = useState<Hud | null>(null);
  const [storedBest, setStoredBest] = useState(0);

  const restart = useCallback(() => {
    const next = newGame(randomSeed());
    game.current = next;
    launch.current = false;
    progress.current = 0;
    setStoredBest(readBest());
    setHud(hudOf(next));
  }, []);

  // La semilla es al azar: la partida se crea ya en el navegador, no al renderizar.
  useEffect(() => {
    const frame = requestAnimationFrame(restart);
    return () => cancelAnimationFrame(frame);
  }, [restart]);

  const press = useCallback(() => {
    const current = game.current;
    if (current && current.status !== "over") launch.current = true;
  }, []);

  // Bucle del juego: los anillos giran siempre (también mientras se apunta).
  const over = hud?.status === "over";
  const seed = hud?.seed;
  useEffect(() => {
    if (over || seed === undefined) return;
    let frame = 0;
    let last = performance.now();
    let pending = 0;

    const loop = (now: number) => {
      const elapsed = now - last;
      last = now;
      pending += elapsed > MAX_FRAME_MS ? 0 : elapsed;

      let current = game.current;
      while (current && current.status !== "over" && pending >= TICK_MS) {
        pending -= TICK_MS;
        // Lo que se pulsa sin poder lanzar (bola en vuelo) se descarta.
        const wanted = launch.current && canLaunch(current);
        if (!canLaunch(current) || wanted) launch.current = false;
        const next = step(current, wanted);
        sound(current, next);
        current = next;
      }
      progress.current = pending / TICK_MS;
      if (current && current !== game.current) {
        game.current = current;
        setHud((before) => {
          const after = hudOf(current!);
          return before && Object.entries(after).every(([key, value]) => before[key as keyof Hud] === value) ? before : after;
        });
      }
      if (current && current.status !== "over") frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [over, seed]);

  // Teclado: espacio, intro o flecha arriba.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button, a")) return;
      if (event.key !== " " && event.key !== "Enter" && event.key !== "ArrowUp") return;
      event.preventDefault();
      press();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  // Partida terminada: se cuenta y se avisa (puede tocar preguntar qué le parece).
  useEffect(() => {
    if (!over || !viewerId) return;
    try {
      localStorage.setItem(ORBITS_GAMES_KEY, String((Number(localStorage.getItem(ORBITS_GAMES_KEY)) || 0) + 1));
    } catch {
      // Sin almacenamiento: no se cuenta, y no se preguntará.
    }
    reportGameFinished("orbits");
  }, [over, viewerId]);

  const best = Math.max(storedBest, hud?.score ?? 0);
  useEffect(() => {
    if (best > storedBest) writeBest(best);
  }, [best, storedBest]);

  const started = (hud?.level ?? 1) > 1 || hud?.status !== "aim" || (hud?.lives ?? LIVES) < LIVES;

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={t.level} value={hud?.level ?? 1} />
          <Stat label={m.run.yourRecord} value={best} />
          <div className="flex flex-col">
            <span className="text-xs text-muted">{t.lives}</span>
            <span className="flex h-10 items-center gap-1.5" aria-label={t.livesAria(hud?.lives ?? LIVES)}>
              {Array.from({ length: LIVES }, (_, i) => (
                <span key={i} className={`size-3.5 rounded-full ${i < (hud?.lives ?? LIVES) ? "bg-ink" : "bg-line"}`} />
              ))}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={restart}
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
        >
          {m.run.newGame}
        </button>
      </div>

      <div
        className="relative touch-none select-none"
        onPointerDown={(event) => {
          event.preventDefault();
          press();
        }}
      >
        <OrbitsCanvas game={game} progress={progress} label={t.aria} />
        {hud && !started && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <p className="rounded-full bg-bg/85 px-4 py-2 text-sm font-medium backdrop-blur-sm">{t.start}</p>
          </div>
        )}
      </div>

      {hud?.status === "over" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="display text-2xl font-bold">{t.over}</p>
            <p className="text-sm text-muted">
              {t.summary(hud.score)}
            </p>
          </div>
          <button type="button" onClick={restart} className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {m.run.playAgain}
          </button>
        </div>
      )}

      <p className="text-sm text-muted">{t.beta}</p>
      <p className="hidden text-sm text-muted sm:block">{t.controls}</p>
    </section>
  );
}

/** Sonidos del tic: lanzar, cruzar cada anillo (más agudo cuanto más dentro), superar el nivel y chocar. */
function sound(before: OrbitsState, after: OrbitsState) {
  if (after.status === before.status && after.status !== "flying") return;
  if (after.status === "over") return playSound("lose");
  if (after.status === "crashed") return playSound("error");
  if (after.status === "cleared") return playSound("level");
  if (after.status !== "flying") return;
  if (before.status !== "flying") return playSound("tap");
  const crossed = after.rings.findIndex((ring) => before.ball > ring.radius && after.ball <= ring.radius);
  if (crossed >= 0) playSound("pop", { pitch: 1 + crossed * 0.12 });
}

/** Tablero en canvas a la frecuencia de la pantalla, entre un tic y el siguiente. */
function OrbitsCanvas({
  game,
  progress,
  label,
}: {
  game: React.RefObject<OrbitsState | null>;
  progress: React.RefObject<number>;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const state = game.current;
      if (state && canvas.current) drawOrbits(canvas.current, state, progress.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [game, progress]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      className="block aspect-square w-full rounded-[22px]"
      style={{ background: "var(--board)" }}
    />
  );
}

const toRadians = (angle: number) => (angle / FULL_TURN) * Math.PI * 2;

function drawOrbits(canvas: HTMLCanvasElement, state: OrbitsState, progress: number) {
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
  // El tablero va de -700 a 700 en las dos direcciones, con el centro en medio.
  const scale = (size * ratio) / 1400;
  ctx.setTransform(scale, 0, 0, scale, (size * ratio) / 2, (size * ratio) / 2);
  ctx.clearRect(-700, -700, 1400, 1400);

  const moving = state.status !== "over" && state.status !== "crashed";
  const t = state.tick - state.levelStart + (moving ? Math.min(progress, 1) : 0);

  // Recorrido de la bola, de abajo al centro.
  const down = toRadians(LAUNCH_ANGLE);
  ctx.strokeStyle = color("--cell");
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  ctx.moveTo(Math.cos(down) * CORE_RADIUS, Math.sin(down) * CORE_RADIUS);
  ctx.lineTo(Math.cos(down) * START_RADIUS, Math.sin(down) * START_RADIUS);
  ctx.stroke();
  ctx.setLineDash([]);

  // Centro: se ilumina al superar el nivel.
  ctx.fillStyle = state.status === "cleared" ? color("--t512") : color("--cell");
  ctx.beginPath();
  ctx.arc(0, 0, CORE_RADIUS - 20, 0, Math.PI * 2);
  ctx.fill();

  // Anillos: el arco entero menos el hueco.
  ctx.lineWidth = RING_WIDTH;
  ctx.lineCap = "round";
  state.rings.forEach((ring, i) => {
    const center = toRadians(ringAngle(ring, t));
    const half = toRadians(ring.gap / 2);
    ctx.strokeStyle = state.hit === i ? color("--danger") : color(RING_COLORS[i % RING_COLORS.length]!);
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius, center + half, center - half + Math.PI * 2);
    ctx.stroke();
  });

  // Bola: entre su posición y la del siguiente tic.
  const ball = state.status === "flying" ? Math.max(CORE_RADIUS, state.ball - BALL_SPEED * Math.min(progress, 1)) : state.ball;
  if (state.status !== "cleared") {
    ctx.fillStyle = state.status === "crashed" || state.status === "over" ? color("--danger") : color("--ink");
    ctx.beginPath();
    ctx.arc(Math.cos(down) * ball, Math.sin(down) * ball, BALL_RADIUS, 0, Math.PI * 2);
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
