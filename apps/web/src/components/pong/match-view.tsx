"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Avatar } from "@repo/ui/avatar";
import { challenge, fetchMatch, markOf, type MatchWithPlayers } from "@/components/tictactoe/data";
import { MARK_COLOR, ResignButton } from "@/components/tictactoe/match-view";
import { matchHref } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { channelName, subscribeWhenReady } from "@/lib/realtime";

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
  const router = useRouter();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => setMatch(await fetchMatch(matchId)), [matchId]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchMatch(matchId).then((data) => {
      if (!cancelled) setMatch(data);
    });
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`pong-match:${matchId}`))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (payload) => {
          setMatch((current) => (current ? { ...current, ...(payload.new as Match) } : current));
        })
        .subscribe(),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [matchId]);

  async function act(action: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    setError(null);
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) setError("No se ha podido completar. Recarga la página e inténtalo otra vez.");
    else await reload();
  }

  async function rematch() {
    if (!match) return;
    setBusy(true);
    const rival = match.player_x === viewerId ? match.player_o : match.player_x;
    const id = await challenge(rival, "pong");
    setBusy(false);
    if (id) router.push(matchHref({ id, game: "pong" }));
    else setError("No se ha podido crear la revancha.");
  }

  if (match === undefined) return <div className="aspect-[1/1.6] w-full max-w-sm animate-pulse rounded-3xl bg-line/40" />;
  if (match === null) {
    return (
      <p className="text-muted">
        No encontramos esta partida.{" "}
        <Link href="/pong" className="font-medium text-ink underline underline-offset-4">
          Ver tus partidas
        </Link>
      </p>
    );
  }

  const me = markOf(match, viewerId);
  const rival = me === "x" ? match.o : match.x;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {match.status === "active" ? (
        <LiveGame match={match} me={me} rivalName={rival.username} onReported={reload} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex items-center gap-4">
            <Avatar seed={match.x.avatar_seed} parts={match.x.avatar_parts} size={64} mood={moodOf(match, "x")} />
            <span className="text-sm text-muted">contra</span>
            <Avatar seed={match.o.avatar_seed} parts={match.o.avatar_parts} size={64} mood={moodOf(match, "o")} />
          </div>
          <p className="display text-3xl font-bold text-balance">{statusText(match, me, rival.username)}</p>
          {match.status === "finished" && match.end_reason === "points" && (
            <p className="tabular display text-5xl font-bold">
              {match.moves[me === "x" ? 0 : 1]} – {match.moves[me === "x" ? 1 : 0]}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {invitedMe && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => createClient().rpc("respond_match", { match_id: match.id, accept: true }))}
              className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
            >
              Aceptar el reto
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => createClient().rpc("respond_match", { match_id: match.id, accept: false }))}
              className="text-sm text-muted hover:text-ink"
            >
              Rechazar
            </button>
          </>
        )}
        {match.status === "pending" && !invitedMe && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => createClient().rpc("cancel_match", { match_id: match.id }))}
            className="text-sm text-muted hover:text-ink"
          >
            Retirar el reto
          </button>
        )}
        {match.status === "active" && (
          <ResignButton disabled={busy} onConfirm={() => void act(() => createClient().rpc("resign_match", { match_id: match.id }))} />
        )}
        {(match.status === "finished" || match.status === "declined" || match.status === "cancelled") && (
          <button type="button" disabled={busy} onClick={() => void rematch()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {match.status === "finished" ? "Revancha" : "Retar otra vez"}
          </button>
        )}
        <Link href="/pong" className="text-sm text-muted hover:text-ink">
          Todas tus partidas
        </Link>
      </div>
    </div>
  );
}

function moodOf(match: Match, mark: Mark) {
  if (match.status !== "finished" || !match.winner) return "neutral" as const;
  return match.winner === mark ? ("happy" as const) : ("sad" as const);
}

function statusText(match: Match, me: Mark, rivalName: string): string {
  switch (match.status) {
    case "pending":
      return match.created_by === (me === "x" ? match.player_x : match.player_o) ? `Esperando a que ${rivalName} acepte` : `${rivalName} te reta`;
    case "declined":
      return `${rivalName} ha rechazado el reto`;
    case "cancelled":
      return "Reto retirado";
    case "finished":
      if (match.end_reason === "disputed") return "Los marcadores no coincidían: partida sin ganador";
      if (match.end_reason === "resign") return match.winner === me ? `${rivalName} se ha rendido` : "Te has rendido";
      return match.winner === me ? "¡Has ganado!" : `Gana ${rivalName}`;
    default:
      return "";
  }
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
      setResult(error ? "No se ha podido guardar el resultado." : data === "waiting" ? `Esperando a que ${rivalName} confirme el resultado…` : null);
      setPhase("done");
      onReported();
    },
    [match.id, rivalName, onReported],
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
          aria-label={`Pong contra ${rivalName}. Mueve tu pala con el dedo, el ratón, las flechas o A y D.`}
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
        <span className="text-sm text-muted">Tú · a {WIN_SCORE} puntos</span>
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
