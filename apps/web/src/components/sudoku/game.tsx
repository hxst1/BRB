"use client";

import { startRun } from "@/lib/start-run";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { randomSeed } from "@repo/games";
import { GAME_IDS, PEERS, box, col, conflicts, encodeGrid, generate, isSolved, row, type Difficulty } from "@repo/games/sudoku";
import { formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

/** Hora actual (fuera del componente: solo se llama desde eventos y efectos). */
const clock = () => Date.now();

type Save = { status: "saving" } | { status: "saved"; time: number } | { status: "rejected" } | { status: "error"; message: string };

/** Lo que se guarda en el navegador para retomar la partida al volver. */
type Stored = { runId: string | null; seed: number; startedAt: number; values: number[]; notes: number[] };

/** Clave del progreso guardado: una por dificultad, y una por día para el reto diario. */
const storageKey = (difficulty: Difficulty, daily: string | null) => (daily ? `sudoku:daily:${daily}` : `sudoku:${difficulty}`);

/** Casillas de cada caja, en orden de lectura. */
const BOX_CELLS: number[][] = Array.from({ length: 9 }, (_, b) =>
  Array.from({ length: 81 }, (_, cell) => cell).filter((cell) => box(cell) === b),
);

function readStored(difficulty: Difficulty, daily: string | null): Stored | null {
  try {
    const raw = localStorage.getItem(storageKey(difficulty, daily));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(difficulty: Difficulty, daily: string | null, stored: Stored | null) {
  try {
    if (stored) localStorage.setItem(storageKey(difficulty, daily), JSON.stringify(stored));
    else localStorage.removeItem(storageKey(difficulty, daily));
  } catch {
    // Sin almacenamiento (modo privado): simplemente no se podrá retomar.
  }
}

/**
 * Retoma la partida guardada si sigue abierta en el servidor; si no, empieza
 * otra (con sesión, el servidor da la semilla y empieza a contar el tiempo).
 */
async function prepare(difficulty: Difficulty, signedIn: boolean, daily: string | null): Promise<{ stored: Stored; notice: string | null }> {
  const saved = readStored(difficulty, daily);
  if (saved) {
    if (!saved.runId && !signedIn) return { stored: saved, notice: null };
    if (saved.runId && signedIn) {
      const { data } = await createClient().from("game_runs").select("status, started_at").eq("id", saved.runId).maybeSingle();
      if (data?.status === "playing") return { stored: { ...saved, startedAt: new Date(data.started_at).getTime() }, notice: null };
    }
  }

  const fresh = (seed: number, runId: string | null, startedAt: number): Stored => {
    const { puzzle } = generate(difficulty, seed);
    return { runId, seed, startedAt, values: puzzle, notes: Array(81).fill(0) };
  };
  if (!signedIn) return { stored: fresh(randomSeed(), null, clock()), notice: null };

  const { run, notice } = await startRun(GAME_IDS[difficulty], daily !== null);
  return run ? { stored: fresh(run.seed, run.id, clock()), notice: null } : { stored: fresh(randomSeed(), null, clock()), notice };
}

export function SudokuGame({
  viewerId,
  difficulty,
  onSaved,
  daily = null,
}: {
  viewerId: string | null;
  difficulty: Difficulty;
  onSaved: () => void;
  /** Día del reto diario (AAAA-MM-DD) si se juega el reto: un solo intento, sin "Nuevo sudoku". */
  daily?: string | null;
}) {
  const signedIn = viewerId !== null;
  const [game, setGame] = useState<Stored | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  /** Último número pulsado en el teclado: se resalta y se agranda en todo el tablero. */
  const [focusDigit, setFocusDigit] = useState(0);
  /** Estados anteriores, para deshacer (solo en esta pantalla). */
  const [history, setHistory] = useState<Pick<Stored, "values" | "notes">[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [save, setSave] = useState<Save | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [now, setNow] = useState(0);
  const loading = useRef<Promise<{ stored: Stored; notice: string | null }> | null>(null);

  const seed = game?.seed;
  // El sudoku sale de la semilla: se genera una vez por partida.
  const puzzle = useMemo(() => (seed === undefined ? null : generate(difficulty, seed)), [difficulty, seed]);
  const solved = game !== null && puzzle !== null && isSolved(game.values, puzzle.solution);
  const bad = useMemo(() => (game ? conflicts(game.values) : new Set<number>()), [game]);

  const load = useCallback(
    async (fresh: boolean) => {
      if (fresh) writeStored(difficulty, daily, null);
      // Los dos montajes de desarrollo comparten la misma petición.
      if (fresh || !loading.current) loading.current = prepare(difficulty, signedIn, daily);
      const { stored, notice: message } = await loading.current;
      writeStored(difficulty, daily, stored);
      setGame(stored);
      setNotice(message);
      setSave(null);
      setSelected(null);
      setHistory([]);
      setFocusDigit(0);
      setConfirmingNew(false);
      setNow(clock());
    },
    [difficulty, signedIn, daily],
  );

  useEffect(() => {
    let cancelled = false;
    (loading.current ?? (loading.current = prepare(difficulty, signedIn, daily))).then(({ stored, notice: message }) => {
      if (cancelled) return;
      writeStored(difficulty, daily, stored);
      setGame(stored);
      setNotice(message);
      setNow(clock());
    });
    return () => {
      cancelled = true;
    };
  }, [difficulty, signedIn, daily]);

  // Cronómetro de la pantalla (el oficial lo mide el servidor).
  useEffect(() => {
    if (!game || solved) return;
    const timer = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(timer);
  }, [game, solved]);

  const update = useCallback(
    (next: Stored) => {
      setGame(next);
      if (!puzzle || !isSolved(next.values, puzzle.solution)) {
        writeStored(difficulty, daily, next);
        return;
      }
      // Resuelto: se envía el tablero para que el servidor lo valide.
      writeStored(difficulty, daily, null);
      if (!next.runId) return;
      setSave({ status: "saving" });
      fetch(`/api/runs/${next.runId}/finish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moves: encodeGrid(next.values) }),
      })
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (response.ok) {
            setSave({ status: "saved", time: body.score });
            onSaved();
          } else if (response.status === 422) {
            setSave({ status: "rejected" });
          } else {
            setSave({ status: "error", message: body.error ?? "No se pudo guardar la partida." });
          }
        })
        .catch(() => setSave({ status: "error", message: "Sin conexión: la partida no se ha guardado." }));
    },
    [difficulty, daily, puzzle, onSaved],
  );

  /** Escribe (o quita, con 0) un número en la casilla seleccionada. */
  const input = useCallback(
    (digit: number) => {
      if (!game || !puzzle || selected === null || solved || puzzle.puzzle[selected] !== 0) return;
      const values = [...game.values];
      const notes = [...game.notes];
      if (notesMode && digit !== 0) {
        if (values[selected] !== 0) return;
        notes[selected] ^= 1 << digit;
      } else {
        values[selected] = values[selected] === digit ? 0 : digit;
        notes[selected] = 0;
        // Al poner un número, se borra de las notas de su fila, columna y caja.
        if (digit !== 0) for (const peer of PEERS[selected]!) notes[peer] &= ~(1 << digit);
      }
      setHistory((past) => [...past.slice(-49), { values: game.values, notes: game.notes }]);
      update({ ...game, values, notes });
    },
    [game, puzzle, selected, solved, notesMode, update],
  );

  /** Deshace el último cambio (número o nota). */
  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!game || !previous || solved) return;
    setHistory((past) => past.slice(0, -1));
    update({ ...game, values: previous.values, notes: previous.notes });
  }, [game, history, solved, update]);

  // Teclado: números, borrar, flechas y N para las notas.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[1-9]$/.test(event.key)) input(Number(event.key));
      else if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") input(0);
      else if (event.key.toLowerCase() === "z") undo();
      else if (event.key.toLowerCase() === "n") setNotesMode((value) => !value);
      else if (event.key.startsWith("Arrow")) {
        const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[event.key] ?? 0;
        setSelected((cell) => {
          if (cell === null) return 40;
          const next = cell + move;
          if (next < 0 || next > 80 || (Math.abs(move) === 1 && row(next) !== row(cell))) return cell;
          return next;
        });
      } else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input, undo]);

  if (!game || !puzzle) return <div className="aspect-square w-full max-w-[30rem] animate-pulse rounded-[18px] bg-line/40" />;

  // Se resalta el número de la casilla elegida o, si está vacía, el último pulsado en el teclado.
  const selectedDigit = (selected !== null ? game.values[selected] : 0) || focusDigit;
  const remaining = (digit: number) => 9 - game.values.filter((value) => value === digit).length;
  const filledByPlayer = game.values.some((value, i) => value !== 0 && puzzle.puzzle[i] === 0);
  const elapsed = Math.max(0, now - game.startedAt);

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted">Tiempo</span>
          <span className="tabular display text-4xl font-bold">{formatTime(elapsed)}</span>
        </div>
        {daily ? null : confirmingNew ? (
          <span className="flex items-center gap-3 text-sm">
            ¿Empezar otro? Este se pierde.
            <button type="button" onClick={() => void load(true)} className="font-medium text-danger">
              Sí
            </button>
            <button type="button" onClick={() => setConfirmingNew(false)} className="text-muted hover:text-ink">
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (filledByPlayer && !solved ? setConfirmingNew(true) : void load(true))}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            Nuevo sudoku
          </button>
        )}
      </div>

      {/* 3 × 3 cajas, cada una con su cuadrícula: así se separan sin desbordar. */}
      <div role="grid" aria-label="Sudoku" className="sudoku-grid">
        {BOX_CELLS.map((_, b) => (
          <div key={b} className="sudoku-box">
                {BOX_CELLS[b]!.map((cell) => {
                  const value = game.values[cell]!;
              const given = puzzle.puzzle[cell] !== 0;
              const isSelected = selected === cell;
              const related =
                selected !== null && (row(cell) === row(selected) || col(cell) === col(selected) || box(cell) === box(selected));
              const sameDigit = selectedDigit !== 0 && value === selectedDigit;
              const focused = focusDigit !== 0 && value === focusDigit;
              return (
                <button
                  key={cell}
                  type="button"
                  role="gridcell"
                  aria-label={`Fila ${row(cell) + 1}, columna ${col(cell) + 1}: ${value || "vacía"}${given ? " (pista)" : ""}`}
                  aria-selected={isSelected}
                  onClick={() => setSelected(cell)}
                  className={`sudoku-cell ${isSelected ? "sudoku-selected" : sameDigit ? "sudoku-same" : related ? "sudoku-related" : ""} ${
                    focused ? "sudoku-focus" : ""
                  }`}
                      style={{
                    color: bad.has(cell) ? "var(--danger)" : given ? "var(--ink)" : "var(--mark-o)",
                    fontWeight: given ? 700 : 600,
                  }}
                >
                  {value !== 0 ? (
                    value
                  ) : game.notes[cell] ? (
                    <span className="sudoku-notes" aria-hidden>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <span key={digit} className={digit === selectedDigit ? "sudoku-note-match" : undefined}>
                          {game.notes[cell]! & (1 << digit) ? digit : ""}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {solved ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="display text-2xl font-bold">¡Resuelto!</p>
            <p className="text-sm">
              {!game.runId
                ? "Esta partida no entra en el ranking."
                : save?.status === "saving"
                  ? "Guardando…"
                  : save?.status === "saved"
                    ? `Tiempo oficial: ${formatTime(save.time)}. Guardado en el ranking.`
                    : save?.status === "rejected"
                      ? "No hemos podido validar esta partida, así que no cuenta."
                      : save?.status === "error"
                        ? save.message
                        : null}
            </p>
          </div>
          {!daily && (
            <button type="button" onClick={() => void load(true)} className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
              Otro
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-9 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => {
                  // Pulsar el mismo número otra vez deja de resaltarlo.
                  setFocusDigit((current) => (current === digit && selected === null ? 0 : digit));
                  input(digit);
                }}
                aria-pressed={focusDigit === digit}
                className={`display flex aspect-[3/4] flex-col items-center justify-center rounded-xl text-2xl font-bold shadow-soft transition-colors ${
                  focusDigit === digit ? "bg-ink text-bg" : "bg-surface hover:bg-line/60"
                } ${remaining(digit) <= 0 ? "opacity-40" : ""}`}
              >
                {digit}
                <span className={`text-[10px] font-normal ${focusDigit === digit ? "opacity-70" : "text-muted"}`}>
                  {remaining(digit) <= 0 ? "✓" : remaining(digit)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={notesMode}
              onClick={() => setNotesMode((value) => !value)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium shadow-soft transition-colors ${
                notesMode ? "bg-ink text-bg" : "border border-line bg-surface hover:border-muted"
              }`}
            >
              {notesMode ? "Notas: sí" : "Notas: no"}
            </button>
            <button
              type="button"
              onClick={() => input(0)}
              className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted disabled:opacity-40"
            >
              Deshacer
            </button>
          </div>
        </div>
      )}

      {notice && <p className="text-sm text-muted">{notice}</p>}

      {!signedIn && (
        <p className="text-sm text-muted">
          Estás jugando sin cuenta.{" "}
          <Link href="/entrar?next=/sudoku" className="font-medium text-ink underline underline-offset-4">
            Entra
          </Link>{" "}
          para que tus partidas cuenten en el ranking.
        </p>
      )}

      <p className="hidden text-sm text-muted sm:block">Teclado: números para escribir, 0 o retroceso para borrar, flechas para moverte, N para las notas y Z para deshacer.</p>
    </section>
  );
}
