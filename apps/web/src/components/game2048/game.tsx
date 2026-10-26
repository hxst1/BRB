"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { maxTile, move, newGame, type Direction, type Game2048State } from "@repo/games/2048";
import { Avatar } from "@repo/ui/avatar";
import type { Messages } from "@/lib/i18n";
import { ShareStory } from "@/components/share-story";
import { useMessages } from "@/lib/i18n/client";
import type { RunNotice } from "@/lib/start-run";
import { createClient } from "@/lib/supabase/client";
import { Board } from "@repo/ui/board-2048";
import { ChallengeFriends } from "./challenge-friends";
import type { ActiveChallenge } from "./screen";
import { GuestNotice } from "@/components/guest-notice";

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
  | { status: "saved"; score: number; runId: string }
  | { status: "rejected" }
  | { status: "error"; message: string };

/**
 * Con sesión, el servidor da la semilla y la partida cuenta para el ranking;
 * en un reto, la semilla es la de la partida del retador, y en el reto diario,
 * la del día. Sin sesión (o si falla), se juega en local con una semilla aleatoria.
 */
type PreparedGame = { game: Game2048State; runId: string | null; notice: RunNotice | null; special: boolean };

async function prepareGame(signedIn: boolean, challengeId: string | null, daily: boolean): Promise<PreparedGame> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null, special: false };

  const supabase = createClient();
  const { data, error } = challengeId
    ? await supabase.rpc("start_challenge_run", { challenge_id: challengeId })
    : daily
      ? await supabase.rpc("start_daily_run")
      : await supabase.rpc("start_run", { game: "2048" });
  const run = data?.[0];
  if (run) return { game: newGame(run.seed), runId: run.id, notice: null, special: challengeId !== null || daily };

  return {
    game: newGame(randomSeed()),
    runId: null,
    special: false,
    notice:
      error?.hint === "already_played"
        ? daily
          ? "practiceDaily"
          : "alreadyPlayedChallenge"
        : error?.hint === "rate_limited"
          ? "rateLimited"
          : "offline",
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
  daily = false,
  onSaved,
  onExit,
}: {
  viewerId: string | null;
  /** Reto que se está jugando (llega por ?reto=), o null para una partida normal. */
  challenge: ActiveChallenge | null;
  /** Intento del reto diario. */
  daily?: boolean;
  onSaved: () => void;
  /** Salir de un reto (de un amigo o el diario) a una partida normal. */
  onExit: () => void;
}) {
  const m = useMessages();
  const signedIn = viewerId !== null;
  const challengeId = challenge?.id ?? null;
  const [state, setState] = useState<Game2048State | null>(null);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  // Partida de un reto (de un amigo o el diario) con un solo intento.
  const [special, setSpecial] = useState(false);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const runId = useRef<string | null>(null);

  const apply = useCallback((next: PreparedGame) => {
    runId.current = next.runId;
    setStoredBest(readBest());
    setNotice(next.notice);
    setSpecial(next.special);
    setSave(null);
    setSavedRunId(null);
    setPicking(false);
    setState(next.game);
  }, []);

  const start = useCallback(async () => apply(await prepareGame(signedIn, null, false)), [apply, signedIn]);

  // En desarrollo React monta los efectos dos veces. Si cada montaje pidiera su
  // propia partida, el servidor podría atenderlas en otro orden y quedarnos con
  // la que la segunda ya abandonó; por eso ambos comparten la misma petición.
  const initialGame = useRef<{ key: string; promise: Promise<PreparedGame> } | null>(null);

  useEffect(() => {
    const key = `${signedIn}:${challengeId}:${daily}`;
    if (initialGame.current?.key !== key) {
      initialGame.current = { key, promise: prepareGame(signedIn, challengeId, daily) };
    }
    let cancelled = false;
    initialGame.current.promise.then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, signedIn, challengeId, daily]);

  /** Salir de un reto lleva a una partida normal (la página se vuelve a montar sin el reto). */
  const restart = useCallback(() => {
    if (special) onExit();
    else void start();
  }, [special, onExit, start]);

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
          setSave({ status: "saved", score: body.score, runId: id });
          setSavedRunId(id);
          onSaved();
        } else if (response.status === 422) {
          setSave({ status: "rejected" });
        } else {
          setSave({ status: "error", message: body.error ?? m.run.saveError });
        }
      })
      .catch(() => setSave({ status: "error", message: m.run.offlineSave }));
  }, [over, state, onSaved, m]);

  const challengeLive = special && challenge !== null;
  const dailyLive = special && daily;
  const midAttempt = special && state !== null && !state.over && state.moves.length > 0;

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      {challengeLive && (
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft">
          <Avatar seed={challenge.challenger.avatar_seed} parts={challenge.challenger.avatar_parts} size={40} />
          <p className="text-sm">
            <span className="font-semibold">{m.game2048.challengeFrom(challenge.challenger.username)}</span>
            {m.game2048.challengeBefore}
            <span className="tabular font-semibold">{m.format.number(challenge.targetScore)}</span>
            {m.game2048.challengeAfter}
          </p>
        </div>
      )}
      {dailyLive && (
        <p className="rounded-2xl bg-surface p-3 text-sm shadow-soft">
          <span className="font-semibold">{m.run.dailyOneTry}</span>
          {m.run.dailyOneTryRest}
        </p>
      )}

      {/*
        Deslizar sobre los marcadores también mueve (con el pulgar es fácil
        empezar fuera del tablero); el resto de la página se desplaza normal.
      */}
      <div className={`flex flex-col gap-4 ${state && !state.over ? "touch-none" : ""}`} onPointerDown={onPointerDown}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={m.run.points} value={state?.score ?? 0} />
          {challengeLive ? <Stat label={m.game2048.target} value={challenge.targetScore} /> : <Stat label={m.run.yourRecord} value={best} />}
        </div>
        {confirmingExit ? (
          <span className="flex items-center gap-3 text-sm">
            {m.game2048.abandon}
            <button type="button" onClick={onExit} className="font-medium text-danger">
              {m.run.yes}
            </button>
            <button type="button" onClick={() => setConfirmingExit(false)} className="text-muted hover:text-ink">
              {m.run.no}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (midAttempt ? setConfirmingExit(true) : restart())}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            {m.run.newGame}
          </button>
        )}
      </div>

      {state ? <Board state={state} onPointerDown={onPointerDown} /> : <div className="board animate-pulse" />}
      </div>

      {state?.over && (
        <GameOver
          state={state}
          save={save}
          signedIn={signedIn}
          challenge={challengeLive ? challenge : null}
          daily={dailyLive}
          onRestart={restart}
          // Retar con la partida del día daría a conocer el tablero antes de jugarlo.
          onChallengeFriends={savedRunId && !dailyLive ? () => setPicking(true) : undefined}
        />
      )}

      {picking && savedRunId && viewerId && (
        <ChallengeFriends viewerId={viewerId} runId={savedRunId} score={state?.score ?? 0} onClose={() => setPicking(false)} />
      )}

      <p aria-live="polite" className="sr-only">
        {state?.over ? m.game2048.overAria(state.score) : ""}
      </p>

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}

      {!signedIn && <GuestNotice next="/2048" />}

      <p className="hidden text-sm text-muted sm:block">{m.game2048.controls}</p>
    </section>
  );
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
  challenge,
  daily,
  onRestart,
  onChallengeFriends,
}: {
  state: Game2048State;
  save: Save | null;
  signedIn: boolean;
  challenge: ActiveChallenge | null;
  daily: boolean;
  onRestart: () => void;
  onChallengeFriends?: () => void;
}) {
  const m: Messages = useMessages();
  const beatChallenge = challenge !== null && state.score > challenge.targetScore;
  const message = !signedIn
    ? m.run.guest
    : save?.status === "saving"
      ? m.common.saving
      : save?.status === "saved"
        ? daily
          ? m.run.savedDaily
          : m.run.saved
        : save?.status === "rejected"
          ? m.run.rejected
          : save?.status === "error"
            ? save.message
            : null;

  return (
    // Debajo del tablero, sin taparlo: así se ve por qué se ha acabado.
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-soft">
      <div className="flex flex-col gap-1">
        {challenge ? (
          <p className="display text-2xl font-bold text-balance">
            {beatChallenge
              ? m.game2048.beat(challenge.challenger.username)
              : challenge.targetScore === state.score
                ? m.game2048.tie
                : m.game2048.short(m.format.number(challenge.targetScore - state.score + 1))}
          </p>
        ) : daily ? (
          <p className="display text-2xl font-bold">{m.run.dailyDone}</p>
        ) : (
          <p className="display text-2xl font-bold">{m.game2048.boardFull}</p>
        )}
        <p className="text-sm text-muted">
          {m.game2048.summary(m.format.number(state.score), maxTile(state))}
        </p>
        {message && <p className="text-sm">{message}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onRestart} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {m.run.playAgain}
          </button>
          {onChallengeFriends && (
            <button
              type="button"
              onClick={onChallengeFriends}
              className="rounded-full border border-line bg-surface px-5 py-2.5 font-semibold"
            >
              {m.run.challengeFriend}
            </button>
          )}
          {save?.status === "saved" && <ShareStory runId={save.runId} game="2048" />}
      </div>
    </div>
  );
}
