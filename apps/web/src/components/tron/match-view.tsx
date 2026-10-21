"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  GRID,
  ROUND_PAUSE_MS,
  START,
  TICK_MS,
  WIN_ROUNDS,
  canTurn,
  neighbor,
  newGame,
  ownerOf,
  paint,
  step,
  type Direction,
  type Mark,
  type TronState,
} from "@repo/games/tron";
import type { Match } from "@repo/db";
import { LiveMatchShell } from "@/components/live/match-shell";
import { MARK_COLOR } from "@/components/tictactoe/match-view";
import { createClient } from "@/lib/supabase/client";

/** Giros que se pueden encadenar antes del siguiente paso (p. ej. dar la vuelta en U). */
const MAX_QUEUED_TURNS = 2;
/** Últimas posiciones que viajan en cada mensaje: si se pierde alguno, la estela no queda con huecos. */
const HISTORY = 8;
const SWIPE_THRESHOLD = 18;

const KEYS: Record<string, Direction> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

type Phase = "lobby" | "playing" | "paused" | "reporting" | "done";

/** Lo que manda el anfitrión en cada paso. */
type Snapshot = {
  round: number;
  tick: number;
  riders: TronState["riders"];
  score: TronState["score"];
  roundOver: TronState["roundOver"];
  winner: TronState["winner"];
  pause: number;
  history: Record<Mark, number[]>;
};

/**
 * Tron en directo. X hace de anfitrión: simula con el motor y retransmite
 * cada paso; O manda sus giros. Los dos dibujan a la frecuencia de la
 * pantalla, deslizando las motos entre casillas.
 */
export function TronMatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  return <LiveMatchShell matchId={matchId} viewerId={viewerId} game="tron" live={(props) => <LiveTron {...props} />} />;
}

function LiveTron({
  match,
  me,
  rivalName,
  onReported,
}: {
  match: Match;
  me: Mark;
  rivalName: string;
  onReported: () => void;
}) {
  const host = me === "x";
  const rival: Mark = me === "x" ? "o" : "x";
  const canvas = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const state = useRef<TronState>(newGame());
  const history = useRef<Record<Mark, number[]>>({ x: [], o: [] });
  const queues = useRef<Record<Mark, Direction[]>>({ x: [], o: [] });
  /** Cuándo llegó el último paso (invitado) o cuánto falta para el siguiente (anfitrión), para dibujar suave. */
  const lastStepAt = useRef(0);
  const reported = useRef(false);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [rivalHere, setRivalHere] = useState(false);
  const [score, setScore] = useState({ x: 0, o: 0 });
  const [result, setResult] = useState<string | null>(null);
  const phaseRef = useRef<Phase>("lobby");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const report = useCallback(
    async (final: TronState["score"]) => {
      if (reported.current) return;
      reported.current = true;
      setPhase("reporting");
      const { data, error } = await createClient().rpc("report_tron_result", {
        match_id: match.id,
        x_score: final.x,
        o_score: final.o,
      });
      setResult(error ? "No se ha podido guardar el resultado." : data === "waiting" ? `Esperando a que ${rivalName} confirme el resultado…` : null);
      setPhase("done");
      onReported();
    },
    [match.id, rivalName, onReported],
  );

  // Canal privado de la partida: presencia, giros del invitado y pasos del anfitrión.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      // Los canales privados comprueban la política de RLS con el token del usuario.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`tron:${match.id}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: me } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const here = Object.keys(channel!.presenceState()).includes(rival);
          setRivalHere(here);
          if (!here && phaseRef.current === "playing") setPhase("paused");
          if (here && (phaseRef.current === "lobby" || phaseRef.current === "paused")) setPhase("playing");
        })
        .on("broadcast", { event: "turn" }, ({ payload }) => {
          const queue = queues.current.o;
          if (host && queue.length < MAX_QUEUED_TURNS) queue.push((payload as { direction: Direction }).direction);
        })
        .on("broadcast", { event: "step" }, ({ payload }) => {
          if (host) return;
          const snapshot = payload as Snapshot;
          applySnapshot(state, snapshot);
          lastStepAt.current = performance.now();
          setScore((s) => (s.x === snapshot.score.x && s.o === snapshot.score.o ? s : snapshot.score));
          if (snapshot.winner) void report(snapshot.score);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void channel!.track({ online: true });
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [match.id, me, rival, host, report]);

  // Bucle: el anfitrión simula; los dos dibujan.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let pending = 0;

    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;

      if (host && phaseRef.current === "playing" && !state.current.winner) {
        let current = state.current;
        if (current.pause > 0) {
          current = { ...current, pause: Math.max(0, current.pause - dt) };
          pending = 0;
        } else {
          pending += dt;
        }
        while (pending >= TICK_MS && current.pause <= 0 && !current.winner) {
          pending -= TICK_MS;
          const turns: Partial<Record<Mark, Direction>> = {};
          for (const mark of ["x", "o"] as const) turns[mark] = takeTurn(queues.current[mark], current.riders[mark]);
          const round = current.round;
          current = step(current, turns);
          if (current.round !== round) history.current = { x: [], o: [] };
          for (const mark of ["x", "o"] as const) {
            const list = history.current[mark];
            if (current.riders[mark].alive && list.at(-1) !== current.riders[mark].head) list.push(current.riders[mark].head);
            if (list.length > HISTORY) list.shift();
          }
          void channelRef.current?.send({ type: "broadcast", event: "step", payload: toSnapshot(current, history.current) });
          if (current.roundOver || current.winner) setScore({ ...current.score });
          if (current.winner) void report(current.score);
        }
        state.current = current;
        lastStepAt.current = now - pending;
      } else if (!host && phaseRef.current === "playing" && state.current.pause > 0) {
        // Durante las pausas no llegan pasos: la cuenta atrás avanza aquí.
        state.current = { ...state.current, pause: Math.max(0, state.current.pause - dt) };
      }

      const progress = state.current.pause > 0 ? 0 : Math.min(1, (now - lastStepAt.current) / TICK_MS);
      draw(canvas.current, state.current, progress, me);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [host, me, report]);

  // Giros: el anfitrión los encola para el siguiente paso; el invitado se los manda.
  const turn = useCallback(
    (direction: Direction) => {
      if (phaseRef.current !== "playing") return;
      if (host) {
        const queue = queues.current.x;
        if (queue.length < MAX_QUEUED_TURNS) queue.push(direction);
      } else {
        void channelRef.current?.send({ type: "broadcast", event: "turn", payload: { direction } });
      }
    },
    [host],
  );

  // Teclado: flechas o W A S D.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const direction = KEYS[event.key.toLowerCase()];
      if (!direction) return;
      event.preventDefault();
      turn(direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  // Deslizar: el giro se lanza en cuanto el dedo recorre lo suficiente.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function onPointerDown(event: ReactPointerEvent) {
    swipe.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerMove(event: ReactPointerEvent) {
    const origin = swipe.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    swipe.current = { x: event.clientX, y: event.clientY };
  }

  const overlay =
    phase === "lobby"
      ? rivalHere
        ? "¡Vamos!"
        : `Esperando a ${rivalName}…`
      : phase === "paused"
        ? `${rivalName} se ha desconectado. Esperando…`
        : phase === "reporting"
          ? "Guardando el resultado…"
          : phase === "done"
            ? result
            : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-sm">
          <span className="size-3 rounded-sm" style={{ background: MARK_COLOR[me] }} />
          Tú
          <span className="tabular display text-2xl font-bold">{score[me]}</span>
        </span>
        <span className="text-xs text-muted">a {WIN_ROUNDS} rondas</span>
        <span className="flex items-center gap-2 text-sm">
          <span className="tabular display text-2xl font-bold">{score[rival]}</span>
          {rivalName}
          <span className="size-3 rounded-sm" style={{ background: MARK_COLOR[rival] }} />
        </span>
      </div>
      <div className="relative">
        <canvas
          ref={canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (swipe.current = null)}
          onPointerCancel={() => (swipe.current = null)}
          role="img"
          aria-label={`Tron contra ${rivalName}. Gira con las flechas, W A S D o deslizando.`}
          className="block aspect-square w-full touch-none rounded-3xl select-none"
          style={{ background: "var(--board)" }}
        />
        {overlay && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl bg-bg/70 p-6 text-center backdrop-blur-sm">
            <p aria-live="polite" className="display text-2xl font-bold text-balance">
              {overlay}
            </p>
          </div>
        )}
      </div>
      <p className="text-center text-sm text-muted">
        Eres la moto {me === "x" ? "roja, a la izquierda" : "azul, a la derecha"}. Gira con las flechas o deslizando.
      </p>
    </div>
  );
}

/** Primer giro de la cola que se pueda aplicar (los imposibles se descartan). */
function takeTurn(queue: Direction[], rider: TronState["riders"][Mark]): Direction | undefined {
  while (queue.length > 0) {
    const direction = queue.shift()!;
    if (direction !== rider.direction && canTurn(rider, direction)) return direction;
  }
  return undefined;
}

function toSnapshot(state: TronState, history: Record<Mark, number[]>): Snapshot {
  const { round, tick, riders, score, roundOver, winner, pause } = state;
  return { round, tick, riders, score, roundOver, winner, pause, history: { x: [...history.x], o: [...history.o] } };
}

/** El invitado rehace el estado con lo que le llega: nueva ronda, estelas y motos. */
function applySnapshot(ref: { current: TronState }, snapshot: Snapshot) {
  let current = ref.current;
  if (snapshot.round !== current.round) {
    const trails = new Uint8Array(GRID * GRID);
    paint(trails, START.x.cell, "x");
    paint(trails, START.o.cell, "o");
    current = { ...current, round: snapshot.round, trails };
  }
  for (const mark of ["x", "o"] as const) for (const cell of snapshot.history[mark]) paint(current.trails, cell, mark);
  ref.current = {
    ...current,
    tick: snapshot.tick,
    riders: snapshot.riders,
    score: snapshot.score,
    roundOver: snapshot.roundOver,
    winner: snapshot.winner,
    pause: snapshot.pause,
  };
}

function draw(canvas: HTMLCanvasElement | null, state: TronState, progress: number, me: Mark) {
  if (!canvas) return;
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
  const unit = size / GRID;
  ctx.setTransform(ratio * unit, 0, 0, ratio * unit, 0, 0);
  ctx.clearRect(0, 0, GRID, GRID);

  // Cuadrícula fina
  ctx.strokeStyle = color("--cell");
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (let i = 5; i < GRID; i += 5) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, GRID);
    ctx.moveTo(0, i);
    ctx.lineTo(GRID, i);
  }
  ctx.stroke();

  const colors: Record<Mark, string> = { x: color("--mark-x"), o: color("--mark-o") };

  // Estelas
  for (let cell = 0; cell < GRID * GRID; cell++) {
    const owner = ownerOf(state.trails, cell);
    if (!owner) continue;
    ctx.fillStyle = colors[owner];
    ctx.globalAlpha = 0.75;
    ctx.fillRect(cell % GRID, Math.floor(cell / GRID), 1, 1);
  }
  ctx.globalAlpha = 1;

  // Motos: avanzan suavemente hacia la siguiente casilla, y la estela con ellas.
  for (const mark of ["x", "o"] as const) {
    const rider = state.riders[mark];
    const from = { x: rider.head % GRID, y: Math.floor(rider.head / GRID) };
    const nextCell = neighbor(rider.head, rider.direction);
    const t = rider.alive && !state.roundOver && nextCell >= 0 ? progress : 0;
    const to = nextCell >= 0 ? { x: nextCell % GRID, y: Math.floor(nextCell / GRID) } : from;
    const at = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };

    ctx.fillStyle = colors[mark];
    ctx.globalAlpha = 0.75;
    ctx.fillRect(Math.min(from.x, at.x), Math.min(from.y, at.y), Math.abs(at.x - from.x) + 1, Math.abs(at.y - from.y) + 1);
    ctx.globalAlpha = rider.alive ? 1 : 0.4;
    ctx.shadowColor = colors[mark];
    ctx.shadowBlur = rider.alive ? 12 * ratio : 0;
    ctx.beginPath();
    ctx.roundRect(at.x - 0.2, at.y - 0.2, 1.4, 1.4, 0.35);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    if (mark === me && state.pause > 0 && !state.roundOver) {
      // Señala tu moto durante la cuenta atrás.
      ctx.strokeStyle = color("--ink");
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      ctx.arc(at.x + 0.5, at.y + 0.5, 1.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Cuenta atrás y resultado de la ronda
  const message = state.winner
    ? null
    : state.roundOver
      ? state.roundOver === "draw"
        ? "Empate"
        : state.roundOver === me
          ? "¡Ronda para ti!"
          : "Ronda para tu rival"
      : state.pause > 0
        ? state.pause > ROUND_PAUSE_MS / 2
          ? `Ronda ${state.round}`
          : "¡Ya!"
        : null;
  if (message) {
    ctx.fillStyle = color("--ink");
    ctx.font = `700 ${3.2}px ${styles.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, GRID / 2, GRID / 2);
  }
}
