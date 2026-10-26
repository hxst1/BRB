"use client";

import { startRun, type RunNotice } from "@/lib/start-run";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { GAME_IDS, conflicts, encodeQueens, generate, isSolved, type Difficulty } from "@repo/games/queens";
import { createClient } from "@/lib/supabase/client";
import { GuestNotice } from "@/components/guest-notice";
import { NO_PAUSE, PauseButton, PauseCover, endPause, pauseFromRun, playedMs, reportPause, startPause, useAutoPause, type Pause } from "@/components/pause";
import { useMessages } from "@/lib/i18n/client";
import { Crown } from "./crown";

/** Hora actual (fuera del componente: solo se llama desde eventos y efectos). */
const clock = () => Date.now();

type Save =
  | { status: "saving" }
  | { status: "saved"; time: number }
  | { status: "rejected" }
  | { status: "error"; message: string; retry: boolean };

/** Lo que hay en cada casilla. */
const EMPTY = 0;
const CROSS = 1;
const QUEEN = 2;

/** Lo que se guarda en el navegador para retomar la partida al volver. */
type Stored = { runId: string | null; seed: number; startedAt: number; marks: number[]; pause?: Pause };

const storageKey = (difficulty: Difficulty) => `queens:${difficulty}`;

function readStored(difficulty: Difficulty): Stored | null {
  try {
    const raw = localStorage.getItem(storageKey(difficulty));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(difficulty: Difficulty, stored: Stored | null) {
  try {
    if (stored) localStorage.setItem(storageKey(difficulty), JSON.stringify(stored));
    else localStorage.removeItem(storageKey(difficulty));
  } catch {
    // Sin almacenamiento (modo privado): simplemente no se podrá retomar.
  }
}

/**
 * Retoma la partida guardada si sigue abierta en el servidor; si no, empieza
 * otra (con sesión, el servidor da la semilla y empieza a contar el tiempo).
 */
async function prepare(difficulty: Difficulty, signedIn: boolean): Promise<{ stored: Stored; notice: RunNotice | null }> {
  const saved = readStored(difficulty);
  if (saved) {
    if (!saved.runId && !signedIn) return { stored: saved, notice: null };
    if (saved.runId && signedIn) {
      const { data } = await createClient().from("game_runs").select("status, started_at, paused_ms, paused_at").eq("id", saved.runId).maybeSingle();
      if (data?.status === "playing") {
        // El tiempo y las pausas, los del servidor.
        return { stored: { ...saved, startedAt: new Date(data.started_at).getTime(), pause: pauseFromRun(data) }, notice: null };
      }
    }
  }
  const fresh = (seed: number, runId: string | null): Stored => {
    const { size } = generate(difficulty, seed);
    return { runId, seed, startedAt: clock(), marks: Array(size * size).fill(EMPTY) };
  };
  if (!signedIn) return { stored: fresh(randomSeed(), null), notice: null };
  const { run, notice } = await startRun(GAME_IDS[difficulty]);
  return run ? { stored: fresh(run.seed, run.id), notice: null } : { stored: fresh(randomSeed(), null), notice };
}

/** Gesto en curso sobre el tablero: un toque cambia la casilla; arrastrar marca × por donde pasa. */
type Gesture = { start: number; painting: boolean; marks: number[] };

export function QueensGame({ viewerId, difficulty, onSaved }: { viewerId: string | null; difficulty: Difficulty; onSaved: () => void }) {
  const m = useMessages();
  const t = m.queens;
  const signedIn = viewerId !== null;
  const [game, setGame] = useState<Stored | null>(null);
  const [history, setHistory] = useState<number[][]>([]);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const [save, setSave] = useState<Save | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [now, setNow] = useState(0);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const loading = useRef<Promise<{ stored: Stored; notice: RunNotice | null }> | null>(null);
  /** Partida ya enviada al servidor: no se manda dos veces. */
  const submitted = useRef<string | null>(null);

  const seed = game?.seed;
  // El tablero sale de la semilla: se genera una vez por partida.
  const puzzle = useMemo(() => (seed === undefined ? null : generate(difficulty, seed)), [difficulty, seed]);
  // Durante un arrastre se ven las × que va dejando (se guardan al soltar).
  const marks = useMemo(() => gesture?.marks ?? game?.marks ?? [], [gesture, game]);
  const queens = useMemo(() => new Set(marks.flatMap((mark, cell) => (mark === QUEEN ? [cell] : []))), [marks]);
  const bad = useMemo(() => (puzzle ? conflicts(puzzle.size, puzzle.regions, queens) : new Set<number>()), [puzzle, queens]);
  const solved = game !== null && puzzle !== null && isSolved(puzzle, queens);
  const paused = (game?.pause?.since ?? null) !== null;

  const load = useCallback(
    async (fresh: boolean) => {
      if (fresh) writeStored(difficulty, null);
      if (fresh || !loading.current) loading.current = prepare(difficulty, signedIn);
      const { stored, notice: message } = await loading.current;
      writeStored(difficulty, stored);
      setGame(stored);
      setNotice(message);
      setSave(null);
      setHistory([]);
      setConfirmingNew(false);
      setNow(clock());
    },
    [difficulty, signedIn],
  );

  useEffect(() => {
    let cancelled = false;
    (loading.current ?? (loading.current = prepare(difficulty, signedIn))).then(({ stored, notice: message }) => {
      if (cancelled) return;
      writeStored(difficulty, stored);
      setGame(stored);
      setNotice(message);
      setNow(clock());
    });
    return () => {
      cancelled = true;
    };
  }, [difficulty, signedIn]);

  // Cronómetro de la pantalla (el oficial lo mide el servidor).
  useEffect(() => {
    if (!game || solved || paused) return;
    const timer = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(timer);
  }, [game, solved, paused]);

  const commit = useCallback(
    (next: Stored) => {
      setGame(next);
      writeStored(difficulty, next);
    },
    [difficulty],
  );

  /**
   * Manda el tablero resuelto al servidor. Se borra del navegador solo cuando
   * el servidor ya la ha cerrado: si falla la red, se puede reintentar.
   */
  const submit = useCallback(
    (stored: Stored) => {
      if (!stored.runId || !puzzle || submitted.current === stored.runId) return;
      submitted.current = stored.runId;
      setSave({ status: "saving" });
      const solvedQueens = new Set(stored.marks.flatMap((mark, cell) => (mark === QUEEN ? [cell] : [])));
      fetch(`/api/runs/${stored.runId}/finish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moves: encodeQueens(puzzle.size, solvedQueens) }),
      })
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (response.ok) {
            writeStored(difficulty, null);
            setSave({ status: "saved", time: body.score });
            onSaved();
          } else if (response.status === 422) {
            writeStored(difficulty, null);
            setSave({ status: "rejected" });
          } else if (response.status === 409) {
            writeStored(difficulty, null);
            setSave({ status: "error", message: body.error ?? m.run.saveError, retry: false });
          } else {
            submitted.current = null;
            setSave({ status: "error", message: body.error ?? m.run.saveError, retry: true });
          }
        })
        .catch(() => {
          submitted.current = null;
          setSave({ status: "error", message: m.run.offlineSave, retry: true });
        });
    },
    [difficulty, puzzle, onSaved, m],
  );

  useEffect(() => {
    if (!solved || !game) return;
    if (game.runId) submit(game);
    // Sin sesión no hay nada que enviar: la próxima vez, tablero nuevo.
    else writeStored(difficulty, null);
  }, [solved, game, difficulty, submit]);

  const pauseGame = useCallback(() => {
    if (!game || solved || paused) return;
    commit({ ...game, pause: startPause(game.pause ?? NO_PAUSE, clock()) });
    reportPause(game.runId, true);
  }, [game, solved, paused, commit]);

  const resumeGame = useCallback(() => {
    if (!game || !paused) return;
    const at = clock();
    commit({ ...game, pause: endPause(game.pause ?? NO_PAUSE, at) });
    setNow(at);
    reportPause(game.runId, false);
  }, [game, paused, commit]);

  // Al cambiar de app o salir del juego, en pausa (se retoma al volver).
  useAutoPause(pauseGame, { onLeave: true });

  /** Guarda unas marcas nuevas (con su paso para deshacer). */
  const change = useCallback(
    (next: number[]) => {
      if (!game || next.every((mark, cell) => mark === game.marks[cell])) return;
      setHistory((past) => [...past.slice(-99), game.marks]);
      commit({ ...game, marks: next });
    },
    [game, commit],
  );

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!game || !previous || solved || paused) return;
    setHistory((past) => past.slice(0, -1));
    commit({ ...game, marks: previous });
  }, [game, history, solved, paused, commit]);

  /** Vacía → × → reina → vacía. */
  const cycle = useCallback(
    (cell: number) => {
      if (!game || solved) return;
      const next = [...game.marks];
      next[cell] = (next[cell]! + 1) % 3;
      change(next);
    },
    [game, solved, change],
  );

  // Teclado: Z deshace (las casillas se mueven con Tab y se cambian con Intro o espacio).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== "z") return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      if (paused) resumeGame();
      else undo();
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, paused, resumeGame]);

  const cellAt = (event: ReactPointerEvent) => {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-cell]");
    return target ? Number(target.dataset.cell) : null;
  };

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!game || solved || paused || event.button !== 0) return;
    const cell = cellAt(event);
    if (cell === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ start: cell, painting: false, marks: game.marks });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!gesture) return;
    const cell = cellAt(event);
    if (cell === null || (cell === gesture.start && !gesture.painting)) return;
    // Arrastrando: × en las casillas vacías por donde pasa (empezando por la primera).
    const next = [...gesture.marks];
    for (const target of [gesture.start, cell]) if (next[target] === EMPTY) next[target] = CROSS;
    setGesture({ ...gesture, painting: true, marks: next });
  }

  function onPointerUp() {
    if (!gesture) return;
    setGesture(null);
    if (gesture.painting) change(gesture.marks);
    else cycle(gesture.start);
  }

  if (!game || !puzzle) return <div className="aspect-square w-full max-w-[30rem] animate-pulse rounded-[18px] bg-line/40" />;

  const { size, regions } = puzzle;
  const elapsed = playedMs(game.startedAt, paused ? game.pause!.since! : now, game.pause ?? NO_PAUSE);
  const touched = game.marks.some((mark) => mark !== EMPTY);
  /** Borde grueso donde cambia la región. */
  const edge = (cell: number, other: number) => (regions[cell] === regions[other] ? "1px solid var(--queens-thin)" : "3px solid var(--queens-line)");

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted">{m.minesweeper.time}</span>
          <span className="tabular display text-4xl font-bold">{m.format.time(elapsed)}</span>
        </div>
        <div className="flex items-center gap-2">
          {!solved && <PauseButton paused={paused} onToggle={paused ? resumeGame : pauseGame} />}
          {confirmingNew ? (
            <span className="flex items-center gap-3 text-sm">
              {t.abandon}
              <button type="button" onClick={() => void load(true)} className="font-medium text-danger">
                {m.run.yes}
              </button>
              <button type="button" onClick={() => setConfirmingNew(false)} className="text-muted hover:text-ink">
                {m.run.no}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => (touched && !solved ? setConfirmingNew(true) : void load(true))}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
            >
              {t.newBoard}
            </button>
          )}
        </div>
      </div>

      <div className="relative isolate">
        {paused && <PauseCover onResume={resumeGame} />}
        <div
          role="grid"
          aria-label={t.boardAria(size)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setGesture(null)}
          className="queens grid touch-none overflow-hidden rounded-[18px] select-none"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, border: "3px solid var(--queens-line)" }}
        >
          {marks.map((mark, cell) => {
            const row = Math.floor(cell / size);
            const column = cell % size;
            const wrong = mark === QUEEN && bad.has(cell);
            return (
              <button
                key={cell}
                type="button"
                role="gridcell"
                data-cell={cell}
                aria-label={`${m.lightsOut.cellAria(row + 1, column + 1)}: ${t.regionAria(regions[cell]! + 1)}, ${
                  mark === QUEEN ? (wrong ? t.queenWrong : t.queen) : mark === CROSS ? t.cross : m.minesweeper.empty
                }`}
                // Con el teclado (sin puntero): Intro o espacio cambian la casilla.
                onClick={(event) => {
                  if (event.detail === 0) cycle(cell);
                }}
                className={`queens-cell grid aspect-square place-items-center ${wrong ? "queens-wrong" : ""}`}
                style={{
                  background: `var(--q${regions[cell]})`,
                  borderRight: column < size - 1 ? edge(cell, cell + 1) : undefined,
                  borderBottom: row < size - 1 ? edge(cell, cell + size) : undefined,
                }}
              >
                {mark === QUEEN ? <Crown className="queens-crown" /> : mark === CROSS ? <span className="queens-cross" aria-hidden>×</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {solved ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="display text-2xl font-bold">{m.sudoku.solved}</p>
            <p className="text-sm">
              {!game.runId
                ? m.sudoku.notRanked
                : save?.status === "saving"
                  ? m.common.saving
                  : save?.status === "saved"
                    ? m.minesweeper.officialTime(m.format.time(save.time))
                    : save?.status === "rejected"
                      ? m.run.rejected
                      : save?.status === "error"
                        ? save.message
                        : null}
            </p>
            {save?.status === "error" && save.retry && (
              <button type="button" onClick={() => submit(game)} className="self-start text-sm font-medium underline underline-offset-4">
                {m.errors.retry}
              </button>
            )}
          </div>
          <button type="button" onClick={() => void load(true)} className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {m.sudoku.another}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => change(Array(size * size).fill(EMPTY))}
            disabled={!touched || paused}
            className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted disabled:opacity-40"
          >
            {t.clear}
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0 || paused}
            className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted disabled:opacity-40"
          >
            {m.sudoku.undo}
          </button>
        </div>
      )}

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}

      {!signedIn && <GuestNotice next="/reinas" />}

      <p className="text-sm text-muted">{t.hint}</p>
    </section>
  );
}
