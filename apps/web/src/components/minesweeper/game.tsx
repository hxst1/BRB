"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { randomSeed } from "@repo/games";
import { DIFFICULTIES, GAME_IDS, chord, encodeOpened, newGame, reveal, type Difficulty, type MinesweeperState } from "@repo/games/minesweeper";
import { startRun, type RunNotice } from "@/lib/start-run";
import { createClient } from "@/lib/supabase/client";
import { GuestNotice } from "@/components/guest-notice";
import { NO_PAUSE, PauseButton, PauseCover, endPause, playedMs, reportPause, startPause, useAutoPause, type Pause } from "@/components/pause";
import { ShareStory } from "@/components/share-story";
import { useMessages } from "@/lib/i18n/client";

/** Cuánto hay que mantener pulsado para poner una bandera en el móvil. */
const LONG_PRESS_MS = 380;

const NUMBER_COLORS = ["", "var(--mark-o)", "var(--t512)", "var(--mark-x)", "var(--t2048)", "var(--t64)", "var(--t1024)", "var(--ink)", "var(--muted)"];

/** Hora actual (fuera del componente: solo se llama desde eventos y efectos). */
const clock = () => Date.now();

type Save = { status: "saving" } | { status: "saved"; time: number; runId: string } | { status: "rejected" } | { status: "error"; message: string };

/**
 * Con sesión, la partida empieza en el servidor al abrir la primera casilla
 * (de ahí sale la semilla y empieza a contar el tiempo oficial). Sin sesión,
 * se juega en local.
 */
export function MinesweeperGame({
  viewerId,
  difficulty,
  onSaved,
  daily = null,
}: {
  viewerId: string | null;
  difficulty: Difficulty;
  onSaved: () => void;
  /** Día del reto diario (AAAA-MM-DD) si se juega el reto. */
  daily?: string | null;
}) {
  const m = useMessages();
  const signedIn = viewerId !== null;
  const { columns, rows, mines } = DIFFICULTIES[difficulty];
  const [state, setState] = useState<MinesweeperState | null>(null);
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [flagMode, setFlagMode] = useState(false);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<RunNotice | null>(null);
  const [save, setSave] = useState<Save | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [pause, setPause] = useState<Pause>(NO_PAUSE);
  const runId = useRef<string | null>(null);
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);

  const status = state?.status ?? "playing";
  const playing = state !== null && status === "playing";
  const paused = pause.since !== null;

  function restart() {
    runId.current = null;
    setState(null);
    setFlags(new Set());
    setNotice(null);
    setSave(null);
    setStartedAt(null);
    setPause(NO_PAUSE);
  }

  // Cronómetro de la pantalla (el oficial lo mide el servidor).
  useEffect(() => {
    if (!playing || startedAt === null || paused) return;
    const timer = setInterval(() => setNow(clock()), 100);
    return () => clearInterval(timer);
  }, [playing, startedAt, paused]);

  function pauseGame() {
    if (!playing || startedAt === null || paused) return;
    setPause(startPause(pause, clock()));
    reportPause(runId.current, true);
  }

  function resumeGame() {
    if (!paused) return;
    const at = clock();
    setPause(endPause(pause, at));
    setNow(at);
    reportPause(runId.current, false);
  }

  // Al cambiar de app o de pestaña, en pausa.
  useAutoPause(pauseGame);

  /** Primera casilla: pide la partida al servidor y coloca las minas. */
  async function firstOpen(cell: number) {
    setStarting(true);
    let seed = randomSeed();
    if (signedIn) {
      const { run, notice: message } = await startRun(GAME_IDS[difficulty], daily !== null);
      if (run) {
        seed = run.seed;
        runId.current = run.id;
      } else {
        setNotice(message);
      }
    }
    setStarting(false);
    const startedNow = clock();
    setStartedAt(startedNow);
    setNow(startedNow);
    setPause(NO_PAUSE);
    finishIfOver(reveal(newGame(difficulty, seed), cell));
  }

  function finishIfOver(next: MinesweeperState) {
    setState(next);
    if (next.status === "lost" && runId.current) {
      // Perdida: se cierra en el servidor (en el reto diario, el intento queda usado).
      const id = runId.current;
      runId.current = null;
      void createClient()
        .rpc("abandon_run", { run_id: id })
        .then(() => {
          if (daily !== null) onSaved();
        });
      return;
    }
    if (next.status !== "won") return;
    const id = runId.current;
    runId.current = null;
    if (!id) return;
    setSave({ status: "saving" });
    fetch(`/api/runs/${id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moves: encodeOpened(next.opened) }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          setSave({ status: "saved", time: body.score, runId: id });
          onSaved();
        } else if (response.status === 422) {
          setSave({ status: "rejected" });
        } else {
          setSave({ status: "error", message: body.error ?? m.run.saveError });
        }
      })
      .catch(() => setSave({ status: "error", message: m.run.offlineSave }));
  }

  function toggleFlag(cell: number) {
    if (!state || state.status !== "playing" || state.revealed.has(cell)) return;
    setFlags((current) => {
      const next = new Set(current);
      if (next.has(cell)) next.delete(cell);
      else next.add(cell);
      return next;
    });
  }

  function open(cell: number) {
    if (paused) return resumeGame();
    if (starting || status !== "playing") return;
    if (state === null) {
      if (!flagMode) void firstOpen(cell);
      return;
    }
    if (flagMode) return toggleFlag(cell);
    if (state.revealed.has(cell)) return finishIfOver(chord(state, cell, flags));
    if (flags.has(cell)) return;
    finishIfOver(reveal(state, cell));
  }

  // Pulsación larga = bandera (en el móvil); el clic que llega al soltar se ignora.
  function onPointerDown(event: PointerEvent, cell: number) {
    if (event.pointerType === "mouse") return;
    const timer = setTimeout(() => {
      if (longPress.current) longPress.current.fired = true;
      toggleFlag(cell);
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
    longPress.current = { timer, fired: false };
  }
  function cancelLongPress() {
    if (longPress.current) clearTimeout(longPress.current.timer);
  }
  function onClick(cell: number) {
    const fired = longPress.current?.fired;
    longPress.current = null;
    if (!fired) open(cell);
  }
  function onContextMenu(event: MouseEvent, cell: number) {
    event.preventDefault();
    if (state !== null) toggleFlag(cell);
  }

  // Al terminar, el cronómetro deja de actualizarse y se queda en el último valor.
  const elapsed = startedAt === null ? 0 : playedMs(startedAt, pause.since ?? now, pause);
  const showMines = status === "lost";

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label={m.minesweeper.mines} value={String(mines - flags.size)} />
          <Stat label={m.minesweeper.time} value={m.format.time(Math.max(0, elapsed))} />
        </div>
        <div className="flex items-center gap-2">
        {playing && startedAt !== null && <PauseButton paused={paused} onToggle={paused ? resumeGame : pauseGame} />}
        <button
          type="button"
          aria-pressed={flagMode}
          onClick={() => setFlagMode((value) => !value)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-soft transition-colors ${
            flagMode ? "bg-ink text-bg" : "border border-line bg-surface hover:border-muted"
          }`}
        >
          <FlagIcon /> {flagMode ? m.minesweeper.flagging : m.minesweeper.flagMode}
        </button>
        </div>
      </div>

      <div className="relative isolate">
      {paused && <PauseCover onResume={resumeGame} />}
      <div
        role="grid"
        aria-label={m.minesweeper.boardAria(columns, rows, mines)}
        className="grid touch-manipulation gap-[2px] rounded-[18px] p-1.5 select-none"
        style={{ background: "var(--board)", gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns * rows }, (_, cell) => {
          const revealed = state?.revealed.has(cell) ?? false;
          const isMine = state?.mines?.has(cell) ?? false;
          const count = state?.counts[cell] ?? 0;
          const flagged = flags.has(cell);
          const exploded = state?.exploded === cell;
          const label = revealed ? (count ? m.minesweeper.around(count) : m.minesweeper.empty) : flagged ? m.minesweeper.flagged : m.minesweeper.closed;
          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              aria-label={`${m.lightsOut.cellAria(Math.floor(cell / columns) + 1, (cell % columns) + 1)}: ${label}`}
              disabled={starting || (status !== "playing" && !showMines)}
              onClick={() => onClick(cell)}
              onContextMenu={(event) => onContextMenu(event, cell)}
              onPointerDown={(event) => onPointerDown(event, cell)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              className="display grid aspect-square place-items-center rounded-[22%] text-[clamp(11px,3.4vw,18px)] leading-none font-bold transition-colors"
              style={{
                background: exploded ? "var(--mark-x)" : revealed ? "transparent" : "var(--cell)",
                color: revealed ? NUMBER_COLORS[count] : undefined,
              }}
            >
              {revealed && count > 0 ? count : showMines && isMine ? <MineIcon /> : flagged ? <FlagIcon /> : null}
            </button>
          );
        })}
      </div>
      </div>

      {status !== "playing" && state && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-soft">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="display text-2xl font-bold">{status === "won" ? m.minesweeper.won : m.minesweeper.lost}</p>
            <p className="text-sm">
              {status === "won"
                ? !signedIn
                  ? m.run.guest
                  : save?.status === "saving"
                    ? m.common.saving
                    : save?.status === "saved"
                      ? m.minesweeper.officialTime(m.format.time(save.time))
                      : save?.status === "rejected"
                        ? m.run.rejected
                        : save?.status === "error"
                          ? save.message
                          : null
                : daily === null
                  ? m.minesweeper.minesShown
                  : m.minesweeper.minesShownDaily}
            </p>
          </div>
          {/* Otra partida (en el reto diario hay un solo intento) y, debajo, compartir. */}
          <div className="flex shrink-0 flex-col gap-2">
            {daily === null && (
              <button type="button" onClick={restart} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
                {m.run.playAgain}
              </button>
            )}
            {save?.status === "saved" && <ShareStory runId={save.runId} game="minesweeper" />}
          </div>
        </div>
      )}

      {notice && <p className="text-sm text-muted">{m.run[notice]}</p>}

      {!signedIn && <GuestNotice next="/buscaminas" />}

      <p className="text-sm text-muted">
        {m.minesweeper.hint}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="tabular display text-4xl font-bold">{value}</span>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-[1em]" aria-hidden>
      <path d="M4 2v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.8 2.6h7.4l-1.9 2.8 1.9 2.8H4.8z" fill="var(--mark-x)" />
    </svg>
  );
}

function MineIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-[1.05em]" aria-hidden>
      <circle cx="8" cy="8" r="4.4" fill="var(--ink)" />
      <path d="M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
