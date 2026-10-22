"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  BALL_RADIUS,
  clampPaddle,
  FIELD_HEIGHT,
  newGame,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  paddleLine,
  step,
  WIN_SCORE,
  type Mark,
  type PongState,
} from "@repo/games/pong";
import type { Match } from "@repo/db";
import { LiveMatchShell } from "@/components/live/match-shell";
import { MARK_COLOR } from "@/components/tictactoe/match-view";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/client";

/** Cada cuánto se retransmite el estado (el anfitrión) o la pala (el invitado). */
const SEND_INTERVAL_MS = 33;
/** Velocidad de la pala con teclado (anchos de campo por segundo). */
const KEY_SPEED = 1.6;

type Phase = "lobby" | "playing" | "paused" | "reporting" | "done";

/**
 * Pong en directo. X hace de anfitrión: simula la física y retransmite el
 * estado; O solo manda su pala. Los dos se ven a sí mismos abajo.
 */
export function PongMatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  return <LiveMatchShell matchId={matchId} viewerId={viewerId} game="pong" live={(props) => <LiveGame {...props} />} />;
}

// ---------------------------------------------------------------------------
// Partida en directo
// ---------------------------------------------------------------------------

type Wire = Pick<PongState, "ball" | "paddles" | "score" | "pause" | "winner">;

function LiveGame({
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
  const m = useMessages();
  const host = me === "x";
  const rival: Mark = me === "x" ? "o" : "x";
  const canvas = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const state = useRef<PongState>(newGame("x"));
  const myPaddle = useRef(0.5);
  const rivalPaddle = useRef(0.5);
  const keys = useRef({ left: false, right: false });
  const reported = useRef(false);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [rivalHere, setRivalHere] = useState(false);
  const [score, setScore] = useState({ x: 0, o: 0 });
  const [result, setResult] = useState<string | null>(null);
  // El bucle de juego y los callbacks de Realtime leen la fase sin re-suscribirse.
  const phaseRef = useRef<Phase>("lobby");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const report = useCallback(
    async (final: Wire) => {
      if (reported.current || !final.winner) return;
      reported.current = true;
      setPhase("reporting");
      const { data, error } = await createClient().rpc("report_pong_result", {
        match_id: match.id,
        x_score: final.score.x,
        o_score: final.score.o,
      });
      setResult(error ? m.live.saveError : data === "waiting" ? m.live.waitingConfirm(rivalName) : null);
      setPhase("done");
      onReported();
    },
    [match.id, rivalName, onReported, m],
  );

  // Canal privado de la partida: presencia + retransmisión.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      // Los canales privados comprueban la política de RLS con el token del usuario.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`pong:${match.id}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: me } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const present = Object.keys(channel!.presenceState());
          const here = present.includes(rival);
          setRivalHere(here);
          if (!here && phaseRef.current === "playing") setPhase("paused");
          if (here && (phaseRef.current === "lobby" || phaseRef.current === "paused")) setPhase("playing");
        })
        .on("broadcast", { event: "state" }, ({ payload }) => {
          if (host) return;
          const wire = payload as Wire;
          state.current = { ...state.current, ...wire };
          setScore((s) => (s.x === wire.score.x && s.o === wire.score.o ? s : wire.score));
          if (wire.winner) void report(wire);
        })
        .on("broadcast", { event: "paddle" }, ({ payload }) => {
          if (host) rivalPaddle.current = (payload as { x: number }).x;
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

  // Bucle de juego y dibujo.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastSent = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Teclado
      const dir = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0);
      if (dir !== 0) myPaddle.current = clampPaddle(myPaddle.current + dir * KEY_SPEED * dt);

      const playing = phaseRef.current === "playing";
      if (host && playing) {
        const result = step(state.current, dt, { x: myPaddle.current, o: rivalPaddle.current });
        state.current = result.state;
        if (result.events.includes("point")) setScore({ ...result.state.score });
        if (now - lastSent > SEND_INTERVAL_MS || result.state.winner) {
          lastSent = now;
          const { ball, paddles, score: s, pause, winner } = result.state;
          void channelRef.current?.send({ type: "broadcast", event: "state", payload: { ball, paddles, score: s, pause, winner } });
        }
        if (result.state.winner) void report(result.state);
      } else if (!host && playing && now - lastSent > SEND_INTERVAL_MS) {
        lastSent = now;
        void channelRef.current?.send({ type: "broadcast", event: "paddle", payload: { x: myPaddle.current } });
        // Entre mensajes, la pelota sigue su trayectoria para que no vaya a saltos.
        const ball = state.current.ball;
        if (state.current.pause <= 0) state.current = { ...state.current, ball: { ...ball, x: ball.x + ball.vx * dt, y: ball.y + ball.vy * dt } };
      }

      draw(canvas.current, state.current, me, myPaddle.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [host, me, report]);

  // Teclado: flechas o A/D.
  useEffect(() => {
    const set = (event: KeyboardEvent, down: boolean) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") keys.current.left = down;
      else if (key === "arrowright" || key === "d") keys.current.right = down;
      else return;
      event.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => set(e, true);
    const onUp = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Dedo o ratón: la pala sigue al puntero.
  function onPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    myPaddle.current = clampPaddle((event.clientX - rect.left) / rect.width);
  }

  const overlay =
    phase === "lobby"
      ? rivalHere
        ? m.live.go
        : m.live.waitingFor(rivalName)
      : phase === "paused"
        ? m.live.disconnected(rivalName)
        : phase === "reporting"
          ? m.live.saving
          : phase === "done"
            ? result
            : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{rivalName}</span>
        <span className="tabular display text-3xl font-bold" style={{ color: MARK_COLOR[rival] }}>
          {score[rival]}
        </span>
      </div>
      <div className="relative">
        <canvas
          ref={canvas}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          aria-label={m.live.pongAria(rivalName)}
          role="img"
          className="block aspect-[1/1.6] w-full touch-none rounded-3xl bg-[var(--board)]"
        />
        {overlay && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl bg-bg/70 p-6 text-center backdrop-blur-sm">
            <p aria-live="polite" className="display text-2xl font-bold text-balance">
              {overlay}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{m.live.youTo(WIN_SCORE)}</span>
        <span className="tabular display text-3xl font-bold" style={{ color: MARK_COLOR[me] }}>
          {score[me]}
        </span>
      </div>
    </div>
  );
}

/** Dibuja el campo; cada jugador se ve abajo (O ve el campo volteado). */
function draw(canvas: HTMLCanvasElement | null, state: PongState, me: Mark, myPaddle: number) {
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const scale = width; // 1 unidad = ancho del campo
  const flip = me === "o";
  const toY = (y: number) => (flip ? FIELD_HEIGHT - y : y) * scale;
  const styles = getComputedStyle(canvas);
  const ink = styles.getPropertyValue("--ink").trim() || "#15171c";
  const cell = styles.getPropertyValue("--cell").trim() || "#d6dae4";

  // Línea central
  ctx.strokeStyle = cell;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(0, (FIELD_HEIGHT / 2) * scale);
  ctx.lineTo(width, (FIELD_HEIGHT / 2) * scale);
  ctx.stroke();
  ctx.setLineDash([]);

  // Palas: la mía con la posición local (sin esperar a la red).
  for (const mark of ["x", "o"] as const) {
    const x = mark === me ? myPaddle : state.paddles[mark];
    const y = toY(paddleLine(mark));
    ctx.fillStyle = styles.getPropertyValue(mark === "x" ? "--mark-x" : "--mark-o").trim();
    const w = PADDLE_WIDTH * scale;
    const h = PADDLE_HEIGHT * scale;
    ctx.beginPath();
    ctx.roundRect(x * scale - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
  }

  // Pelota
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(state.ball.x * scale, toY(state.ball.y), BALL_RADIUS * scale, 0, Math.PI * 2);
  ctx.fill();
}
