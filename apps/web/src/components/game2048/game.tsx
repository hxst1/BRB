"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { maxTile, move, newGame, type Direction, type Game2048State } from "@repo/games/2048";
import { Avatar } from "@/components/avatar";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { Board } from "./board";
import { ChallengeFriends } from "./challenge-friends";
import type { ActiveChallenge } from "./screen";

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
 * Con sesión, el servidor da la semilla y la partida cuenta para el ranking;
 * en un reto, la semilla es la de la partida del retador. Sin sesión (o si
 * falla), se juega en local con una semilla aleatoria.
 */
type PreparedGame = { game: Game2048State; runId: string | null; notice: string | null; inChallenge: boolean };

async function prepareGame(signedIn: boolean, challengeId: string | null): Promise<PreparedGame> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null, inChallenge: false };

  const supabase = createClient();
  const { data, error } = challengeId
    ? await supabase.rpc("start_challenge_run", { challenge_id: challengeId })
    : await supabase.rpc("start_run", { game: "2048" });
  const run = data?.[0];
  if (run) return { game: newGame(run.seed), runId: run.id, notice: null, inChallenge: challengeId !== null };

  return {
    game: newGame(randomSeed()),
    runId: null,
    inChallenge: false,
    notice:
      error?.hint === "already_played"
        ? "Ya jugaste este reto. Esta es una partida normal."
        : error?.hint === "rate_limited"
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

export function Game2048({
  viewerId,
  challenge,
  onSaved,
  onExitChallenge,
}: {
  viewerId: string | null;
  /** Reto que se está jugando (llega por ?reto=), o null para una partida normal. */
  challenge: ActiveChallenge | null;
  onSaved: () => void;
  onExitChallenge: () => void;
}) {
  const signedIn = viewerId !== null;
  const challengeId = challenge?.id ?? null;
  const [state, setState] = useState<Game2048State | null>(null);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inChallenge, setInChallenge] = useState(false);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const runId = useRef<string | null>(null);

  const apply = useCallback((next: PreparedGame) => {
    runId.current = next.runId;
    setStoredBest(readBest());
    setNotice(next.notice);
    setInChallenge(next.inChallenge);
    setSave(null);
    setSavedRunId(null);
    setPicking(false);
    setState(next.game);
  }, []);

  const start = useCallback(async () => apply(await prepareGame(signedIn, null)), [apply, signedIn]);

  // En desarrollo React monta los efectos dos veces. Si cada montaje pidiera su
  // propia partida, el servidor podría atenderlas en otro orden y quedarnos con
  // la que la segunda ya abandonó; por eso ambos comparten la misma petición.
  const initialGame = useRef<{ key: string; promise: Promise<PreparedGame> } | null>(null);

  useEffect(() => {
    const key = `${signedIn}:${challengeId}`;
    if (initialGame.current?.key !== key) {
      initialGame.current = { key, promise: prepareGame(signedIn, challengeId) };
    }
    let cancelled = false;
    initialGame.current.promise.then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, signedIn, challengeId]);

  /** Salir de un reto lleva a una partida normal (la página se vuelve a montar sin ?reto=). */
  const restart = useCallback(() => {
    if (inChallenge) onExitChallenge();
    else void start();
  }, [inChallenge, onExitChallenge, start]);

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
          setSavedRunId(id);
          onSaved();
        } else if (response.status === 422) {
          setSave({ status: "rejected" });
        } else {
          setSave({ status: "error", message: body.error ?? "No se pudo guardar la partida." });
        }
      })
      .catch(() => setSave({ status: "error", message: "Sin conexión: la partida no se ha guardado." }));
  }, [over, state, onSaved]);

  const challengeLive = inChallenge && challenge !== null;
  const midChallenge = challengeLive && state !== null && !state.over && state.moves.length > 0;

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      {challengeLive && (
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft">
          <Avatar seed={challenge.challenger.avatar_seed} parts={challenge.challenger.avatar_parts} size={40} />
          <p className="text-sm">
            <span className="font-semibold">Reto de {challenge.challenger.username}.</span> Misma partida que jugó: supera
            sus <span className="tabular font-semibold">{formatNumber(challenge.targetScore)}</span> puntos. Solo tienes un
            intento.
          </p>
        </div>
      )}

      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label="Puntos" value={state?.score ?? 0} />
          {challengeLive ? <Stat label="Objetivo" value={challenge.targetScore} /> : <Stat label="Tu récord" value={best} />}
        </div>
        {confirmingExit ? (
          <span className="flex items-center gap-3 text-sm">
            ¿Abandonar el reto? Lo perderás.
            <button type="button" onClick={onExitChallenge} className="font-medium text-danger">
              Sí
            </button>
            <button type="button" onClick={() => setConfirmingExit(false)} className="text-muted hover:text-ink">
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (midChallenge ? setConfirmingExit(true) : restart())}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            Nueva partida
          </button>
        )}
      </div>

      {state ? (
        <Board state={state} onPointerDown={onPointerDown}>
          {state.over && (
            <GameOver
              state={state}
              save={save}
              signedIn={signedIn}
              challenge={challengeLive ? challenge : null}
              onRestart={restart}
              onChallengeFriends={savedRunId ? () => setPicking(true) : undefined}
            />
          )}
        </Board>
      ) : (
        <div className="board animate-pulse" />
      )}

      {picking && savedRunId && viewerId && (
        <ChallengeFriends viewerId={viewerId} runId={savedRunId} score={state?.score ?? 0} onClose={() => setPicking(false)} />
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
      <span className="tabular display text-4xl font-bold">{formatNumber(value)}</span>
    </div>
  );
}

function GameOver({
  state,
  save,
  signedIn,
  challenge,
  onRestart,
  onChallengeFriends,
}: {
  state: Game2048State;
  save: Save | null;
  signedIn: boolean;
  challenge: ActiveChallenge | null;
  onRestart: () => void;
  onChallengeFriends?: () => void;
}) {
  const beatChallenge = challenge !== null && state.score > challenge.targetScore;
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
        {challenge ? (
          <p className="display text-2xl font-bold text-balance">
            {beatChallenge
              ? `¡Has superado a ${challenge.challenger.username}!`
              : challenge.targetScore === state.score
                ? "Empate: había que superarle"
                : `Te han faltado ${formatNumber(challenge.targetScore - state.score + 1)} puntos`}
          </p>
        ) : (
          <p className="text-muted">Sin movimientos</p>
        )}
        <p className="tabular display text-6xl font-bold">{formatNumber(state.score)}</p>
        <p className="text-sm text-muted">Ficha más alta: {maxTile(state)}</p>
        {message && <p className="mt-1 text-sm">{message}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onRestart} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            Otra partida
          </button>
          {onChallengeFriends && (
            <button
              type="button"
              onClick={onChallengeFriends}
              className="rounded-full border border-line bg-surface px-5 py-2.5 font-semibold"
            >
              Retar a un amigo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
