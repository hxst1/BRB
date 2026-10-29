"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomSeed } from "@repo/games";
import type { MonsterParts } from "@repo/avatars";
import { CARDS, COLS, PAR_MS, canFlip, dealBoard, finalScore, flip, newGame, timeBonus, type Board, type PairsState } from "@repo/games/pairs";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { startRun, type RunNotice } from "@/lib/start-run";
import { pairMonsters } from "@/lib/pairs-monsters";
import { GuestNotice } from "@/components/guest-notice";
import { playSound } from "@/lib/sound";
import { useMessages } from "@/lib/i18n/client";
import { reportGameFinished } from "@/lib/game-rating";

/** Lo que se ven las dos cartas de un fallo antes de taparse. */
const MISS_MS = 900;

type Save =
  | { status: "saving" }
  | { status: "saved"; score: number }
  | { status: "rejected" }
  | { status: "error"; message: string };

/**
 * Con sesión, la partida empieza en el servidor al girar la primera carta (así
 * el tiempo no corre mientras se lee la página) y cada carta se le pide al
 * girarla. Sin sesión (o si el servidor falla al empezar), se reparte en local.
 */
type Source = { kind: "local"; board: Board } | { kind: "server"; runId: string };

export function PairsGame({ viewerId, onSaved }: { viewerId: string | null; onSaved: () => void }) {
  const m = useMessages();
  const t = m.pairs;
  const signedIn = viewerId !== null;
  const [state, setState] = useState<PairsState>(newGame);
  /** Monstruo de cada carta ya vista (null si aún no se ha girado). */
  const [known, setKnown] = useState<(number | null)[]>(() => Array(CARDS).fill(null));
  /** Cartas boca arriba sin emparejar: la primera del turno y, en un fallo, las dos un momento. */
  const [shown, setShown] = useState<number[]>([]);
  const [monsters, setMonsters] = useState<MonsterParts[] | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedMs, setFinishedMs] = useState<number | null>(null);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source = useRef<Source | null>(null);
  const busy = useRef(false);
  const game = useRef(state);
  const seen = useRef(known);
  /** Para no cruzar respuestas de una partida anterior con la nueva. */
  const round = useRef(0);

  const restart = useCallback(() => {
    round.current++;
    source.current = null;
    busy.current = false;
    game.current = newGame();
    seen.current = Array(CARDS).fill(null);
    setState(game.current);
    setKnown(seen.current);
    setShown([]);
    setMonsters(null);
    setStartedAt(null);
    setFinishedMs(null);
    setSave(null);
    setNotice(null);
    setError(null);
  }, []);

  /** La partida, al girar la primera carta: en el servidor si se puede. */
  const begin = useCallback(async (): Promise<Source> => {
    if (signedIn) {
      const { run, notice: why } = await startRun("pairs");
      if (run) {
        setMonsters(pairMonsters(run.seed));
        return { kind: "server", runId: run.id };
      }
      setNotice(why);
    }
    const seed = randomSeed();
    setMonsters(pairMonsters(seed));
    return { kind: "local", board: dealBoard(seed) };
  }, [signedIn]);

  /** Qué monstruo hay en la carta: en local se sabe; con el servidor, se le pregunta (y lo apunta). */
  const reveal = useCallback(async (from: Source, card: number): Promise<number> => {
    if (from.kind === "local") return from.board[card]!;
    const response = await fetch(`/api/runs/${from.runId}/flip`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ card }),
    });
    if (!response.ok) throw new Error(String(response.status));
    return ((await response.json()) as { pair: number }).pair;
  }, []);

  const press = useCallback(
    async (card: number) => {
      if (busy.current || !canFlip(game.current, card)) return;
      busy.current = true;
      const current = round.current;
      setError(null);
      setShown((cards) => [...cards, card]);
      playSound("flip");
      try {
        if (!source.current) {
          source.current = await begin();
          setStartedAt(Date.now());
        }
        const pair = await reveal(source.current, card);
        if (current !== round.current) return;

        seen.current = seen.current.map((value, i) => (i === card ? pair : value));
        setKnown(seen.current);
        const before = game.current;
        const after = flip(before, seen.current.map((value) => value ?? -1), card);
        game.current = after;
        setState(after);

        if (after.open !== null) return;
        if (after.fails > before.fails) {
          playSound("error");
          await new Promise((resolve) => setTimeout(resolve, MISS_MS));
          if (current !== round.current) return;
          setShown([]);
          return;
        }
        setShown([]);
        if (after.over) {
          setFinishedMs(Date.now());
          playSound("win");
        } else playSound("pop", { pitch: 1 + Math.min(after.streak, 10) * 0.05 });
      } catch {
        if (current !== round.current) return;
        // No ha llegado: la carta vuelve a taparse y se puede intentar otra vez.
        setShown((cards) => cards.filter((value) => value !== card));
        setError(m.match.offline);
      } finally {
        if (current === round.current) busy.current = false;
      }
    },
    [begin, reveal, m],
  );

  // Reloj: corre desde la primera carta hasta la última pareja.
  useEffect(() => {
    if (startedAt === null || finishedMs !== null) return;
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [startedAt, finishedMs]);
  const elapsed = startedAt === null ? 0 : Math.max(0, (finishedMs ?? now) - startedAt);

  // Al terminar con sesión, el servidor valida los giros que apuntó y da la puntuación.
  useEffect(() => {
    const from = source.current;
    if (finishedMs === null || from?.kind !== "server") return;
    setSave({ status: "saving" });
    fetch(`/api/runs/${from.runId}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moves: "" }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          setSave({ status: "saved", score: body.score });
          reportGameFinished("pairs");
          onSaved();
        } else if (response.status === 422) setSave({ status: "rejected" });
        else setSave({ status: "error", message: body.error ?? m.run.saveError });
      })
      .catch(() => setSave({ status: "error", message: m.run.offlineSave }));
  }, [finishedMs, onSaved, m]);

  const over = state.over;
  const score = save?.status === "saved" ? save.score : finalScore(state, elapsed);

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={m.run.points} value={m.format.number(over ? score : Math.max(0, state.points))} />
          <Stat label={t.time} value={m.format.time(elapsed)} />
          {!over && <Stat label={t.bonus} value={`+${m.format.number(timeBonus(elapsed))}`} muted={elapsed >= PAR_MS} />}
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
        role="group"
        aria-label={t.boardAria}
        className="grid gap-2 rounded-[22px] p-2 sm:gap-2.5 sm:p-2.5"
        style={{ background: "var(--board)", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: CARDS }, (_, card) => {
          const pair = known[card];
          const matched = state.matched[card]!;
          const up = matched || shown.includes(card);
          const face = up && pair !== null && monsters ? monsters[pair] : null;
          return (
            <button
              key={card}
              type="button"
              onClick={() => void press(card)}
              disabled={matched || over}
              aria-label={matched ? t.cardMatched(card + 1) : face ? t.cardShown(card + 1) : t.cardHidden(card + 1)}
              className="aspect-square [perspective:600px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default"
            >
              <span
                className={`relative block size-full transition-transform duration-300 [transform-style:preserve-3d] ${up ? "[transform:rotateY(180deg)]" : ""}`}
              >
                {/* Dorso */}
                <span
                  className="absolute inset-0 grid place-items-center rounded-xl shadow-soft [backface-visibility:hidden] sm:rounded-2xl"
                  style={{ background: "var(--t2048)" }}
                >
                  <span className="size-1/3 rounded-full border-4 border-white/35" />
                </span>
                {/* Cara: el monstruo (mientras llega del servidor, vacía) */}
                <span
                  className={`absolute inset-0 grid place-items-center rounded-xl [backface-visibility:hidden] [transform:rotateY(180deg)] sm:rounded-2xl ${
                    matched ? "opacity-60" : "shadow-soft"
                  }`}
                  style={{ background: "var(--surface)" }}
                >
                  {face && <MonsterFace parts={face} happy={matched} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {startedAt === null && <p className="text-sm text-muted">{t.start}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {over && <GameOver state={state} elapsed={elapsed} score={score} save={save} signedIn={signedIn} onRestart={restart} />}

      <p aria-live="polite" className="sr-only">
        {over ? t.summary(m.format.number(score), state.fails) : ""}
      </p>

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}
      {!signedIn && <GuestNotice next="/parejas" />}
    </section>
  );
}

/** El monstruo de la carta, ajustado a su tamaño. */
function MonsterFace({ parts, happy }: { parts: MonsterParts; happy: boolean }) {
  return (
    <span className="grid size-[78%] place-items-center [&>.monster]:!size-full">
      <Avatar seed={0} parts={parts as unknown as Json} size={80} mood={happy ? "happy" : "neutral"} />
    </span>
  );
}

function Stat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className={`tabular display text-4xl font-bold ${muted ? "text-muted" : ""}`}>{value}</span>
    </div>
  );
}

function GameOver({
  state,
  elapsed,
  score,
  save,
  signedIn,
  onRestart,
}: {
  state: PairsState;
  elapsed: number;
  score: number;
  save: Save | null;
  signedIn: boolean;
  onRestart: () => void;
}) {
  const m = useMessages();
  const t = m.pairs;
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
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="display text-2xl font-bold">{t.done}</p>
        <p className="text-sm text-muted">{t.summary(m.format.number(score), state.fails)}</p>
        <p className="text-xs text-muted">
          {t.breakdown(m.format.number(state.points), m.format.number(timeBonus(elapsed)), state.bestStreak)}
        </p>
        {message && <p className="text-sm">{message}</p>}
      </div>
      <button type="button" onClick={onRestart} className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.run.playAgain}
      </button>
    </div>
  );
}
