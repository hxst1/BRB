"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomSeed } from "@repo/games";
import { budgetForLevel, newGame, press, type LightsOutState } from "@repo/games/lightsout";
import { startRun, type RunNotice } from "@/lib/start-run";
import { GuestNotice } from "@/components/guest-notice";
import { LightsBoard } from "./board";
import { LightsOutTutorial, useTutorialDone } from "./tutorial";
import { ShareStory } from "@/components/share-story";
import { useMessages } from "@/lib/i18n/client";

const BEST_KEY = "lightsout:best";
/** Cuánto se ve el aviso de nivel superado. */
const LEVEL_UP_MS = 1200;

type Save =
  | { status: "saving" }
  | { status: "saved"; score: number; runId: string }
  | { status: "rejected" }
  | { status: "error"; message: string };

type Prepared = { game: LightsOutState; runId: string | null; notice: RunNotice | null };

/**
 * Con sesión, el servidor da la semilla y la partida cuenta (también la del
 * reto diario, con `daily`); sin ella (o si falla), se juega en local.
 */
async function prepareGame(signedIn: boolean, daily: boolean): Promise<Prepared> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null };
  const { run, notice } = await startRun("lightsout", daily);
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

type GameProps = {
  viewerId: string | null;
  onSaved: () => void;
  /** Día del reto diario (AAAA-MM-DD) si se juega el reto. */
  daily?: string | null;
};

/**
 * La primera vez, el tutorial (antes de pedir la partida: así no gasta el
 * intento del reto diario); después, el juego.
 */
export function LightsOutGame(props: GameProps) {
  const done = useTutorialDone();
  const [reviewing, setReviewing] = useState(false);
  if (done === null) return <div className="aspect-square w-full max-w-[30rem] animate-pulse rounded-[22px]" style={{ background: "var(--board)" }} />;
  if (!done || reviewing) return <LightsOutTutorial onDone={() => setReviewing(false)} />;
  return <Game {...props} onReviewTutorial={() => setReviewing(true)} />;
}

function Game({ viewerId, onSaved, daily = null, onReviewTutorial }: GameProps & { onReviewTutorial: () => void }) {
  const m = useMessages();
  const signedIn = viewerId !== null;
  const [state, setState] = useState<LightsOutState | null>(null);
  /** Se ha plantado: la partida acaba aunque le queden pulsaciones. */
  const [stopped, setStopped] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const runId = useRef<string | null>(null);

  const apply = useCallback((next: Prepared) => {
    runId.current = next.runId;
    setStoredBest(readBest());
    setNotice(next.notice);
    setSave(null);
    setStopped(false);
    setLevelUp(null);
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

  const ended = state !== null && (state.over || stopped);

  const tap = useCallback(
    (cell: number) => {
      if (!state || ended) return;
      const next = press(state, cell);
      if (next.completed > state.completed) setLevelUp(next.completed);
      setState(next);
    },
    [state, ended],
  );

  useEffect(() => {
    if (levelUp === null) return;
    const timer = setTimeout(() => setLevelUp(null), LEVEL_UP_MS);
    return () => clearTimeout(timer);
  }, [levelUp]);

  // Récord local (por dispositivo; el oficial es el del ranking)
  const best = Math.max(storedBest, state?.completed ?? 0);
  useEffect(() => {
    if (best > storedBest) writeBest(best);
  }, [best, storedBest]);

  // Al terminar (sin pulsaciones o plantándose), enviar las pulsaciones para validar.
  useEffect(() => {
    const id = runId.current;
    if (!ended || !id || !state) return;
    runId.current = null;
    setSave({ status: "saving" });

    fetch(`/api/runs/${id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moves: state.presses }),
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
  }, [ended, state, onSaved, m]);

  const left = state?.pressesLeft ?? 0;
  const lit = state?.lights.filter(Boolean).length ?? 0;

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={m.lightsOut.level} value={state?.level ?? 1} />
          <Stat label={m.lightsOut.presses} value={left} warn={!ended && left <= 2} />
          <Stat label={m.run.yourRecord} value={best} />
        </div>
        {state && !ended && state.presses.length > 0 ? (
          <button
            type="button"
            onClick={() => setStopped(true)}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            {m.lightsOut.stop}
          </button>
        ) : daily === null ? (
          // En el reto diario hay un solo intento.
          <button
            type="button"
            onClick={() => void restart()}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            {m.run.newGame}
          </button>
        ) : null}
      </div>

      {state ? (
        <div className="relative">
          <LightsBoard
            key={state.level}
            lights={state.lights}
            size={state.size}
            label={m.lightsOut.boardAria(state.level, lit)}
            disabled={ended}
            onTap={tap}
          />
          {levelUp !== null && !ended && (
            <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
              <p className="rounded-full bg-bg/85 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                {m.lightsOut.levelUp(levelUp)}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-[22px]" style={{ background: "var(--board)" }} />
      )}

      {state && ended && (
        <GameOver state={state} stopped={stopped} save={save} signedIn={signedIn} onRestart={daily === null ? () => void restart() : undefined} />
      )}

      <p aria-live="polite" className="sr-only">
        {ended ? m.lightsOut.overAria(state?.completed ?? 0) : levelUp !== null ? m.lightsOut.levelUp(levelUp) : ""}
      </p>

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}

      {!signedIn && <GuestNotice next="/lights-out" />}

      <p className="text-sm text-muted">
        {m.lightsOut.hint(state ? budgetForLevel(state.level) : null)}
        {/* Sin partida a medias (y nunca en el reto diario, que tiene un solo intento). */}
        {daily === null && (ended || state?.presses.length === 0) && (
          <>
            {" "}
            <button type="button" onClick={onReviewTutorial} className="font-medium text-ink underline underline-offset-4">
              {m.lightsOut.tutorial.review}
            </button>
          </>
        )}
      </p>
    </section>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  const m = useMessages();
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className={`tabular display text-4xl font-bold ${warn ? "text-danger" : ""}`}>{m.format.number(value)}</span>
    </div>
  );
}

function GameOver({
  state,
  stopped,
  save,
  signedIn,
  onRestart,
}: {
  state: LightsOutState;
  stopped: boolean;
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

  const lit = state.lights.filter(Boolean).length;

  // Debajo del tablero, sin taparlo: así se ven las luces que han quedado encendidas.
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
      <div className="flex min-w-0 flex-col">
        <p className="text-sm text-muted">
          {stopped ? m.lightsOut.stopped : m.lightsOut.outOfPresses(lit)}
        </p>
        <p className="display text-2xl font-bold">
          <span className="tabular">{m.format.number(state.completed)}</span> {m.lightsOut.cleared(state.completed)}
        </p>
        {message && <p className="text-sm">{message}</p>}
      </div>
      {/* Otra partida y, debajo, compartir: del mismo ancho. */}
      <div className="flex shrink-0 flex-col gap-2">
        {onRestart && (
          <button type="button" onClick={onRestart} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {m.run.playAgain}
          </button>
        )}
        {save?.status === "saved" && <ShareStory runId={save.runId} game="lights-out" />}
      </div>
    </div>
  );
}
