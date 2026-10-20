"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomSeed } from "@repo/games";
import { budgetForLevel, newGame, press, type LightsOutState } from "@repo/games/lightsout";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const BEST_KEY = "lightsout:best";
/** Cuánto se ve el aviso de nivel superado. */
const LEVEL_UP_MS = 1200;

type Save =
  | { status: "saving" }
  | { status: "saved"; score: number }
  | { status: "rejected" }
  | { status: "error"; message: string };

type Prepared = { game: LightsOutState; runId: string | null; notice: string | null };

/** Con sesión, el servidor da la semilla y la partida cuenta; sin ella (o si falla), se juega en local. */
async function prepareGame(signedIn: boolean): Promise<Prepared> {
  if (!signedIn) return { game: newGame(randomSeed()), runId: null, notice: null };
  const { data, error } = await createClient().rpc("start_run", { game: "lightsout" });
  const run = data?.[0];
  if (run) return { game: newGame(run.seed), runId: run.id, notice: null };
  return {
    game: newGame(randomSeed()),
    runId: null,
    notice:
      error?.hint === "rate_limited"
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

export function LightsOutGame({ viewerId, onSaved }: { viewerId: string | null; onSaved: () => void }) {
  const signedIn = viewerId !== null;
  const [state, setState] = useState<LightsOutState | null>(null);
  /** Se ha plantado: la partida acaba aunque le queden pulsaciones. */
  const [stopped, setStopped] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [storedBest, setStoredBest] = useState(0);
  const [save, setSave] = useState<Save | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const restart = useCallback(async () => apply(await prepareGame(signedIn)), [apply, signedIn]);

  // Como en el 2048: los dos montajes de desarrollo comparten la misma petición.
  const initialGame = useRef<{ key: boolean; promise: Promise<Prepared> } | null>(null);
  useEffect(() => {
    if (initialGame.current?.key !== signedIn) {
      initialGame.current = { key: signedIn, promise: prepareGame(signedIn) };
    }
    let cancelled = false;
    initialGame.current.promise.then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, signedIn]);

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
          setSave({ status: "saved", score: body.score });
          onSaved();
        } else if (response.status === 422) {
          setSave({ status: "rejected" });
        } else {
          setSave({ status: "error", message: body.error ?? "No se pudo guardar la partida." });
        }
      })
      .catch(() => setSave({ status: "error", message: "Sin conexión: la partida no se ha guardado." }));
  }, [ended, state, onSaved]);

  const left = state?.pressesLeft ?? 0;
  const lit = state?.lights.filter(Boolean).length ?? 0;

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6">
          <Stat label="Nivel" value={state?.level ?? 1} />
          <Stat label="Pulsaciones" value={left} warn={!ended && left <= 2} />
          <Stat label="Tu récord" value={best} />
        </div>
        {state && !ended && state.presses.length > 0 ? (
          <button
            type="button"
            onClick={() => setStopped(true)}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            Plantarse
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void restart()}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted"
          >
            Nueva partida
          </button>
        )}
      </div>

      {state ? (
        <div className="relative">
          <div
            role="group"
            aria-label={`Nivel ${state.level}: ${lit} ${lit === 1 ? "luz encendida" : "luces encendidas"}`}
            className="grid aspect-square w-full rounded-[22px] p-[3%]"
            style={{ background: "var(--board)", gridTemplateColumns: `repeat(${state.size}, 1fr)`, gap: `${12 / state.size}%` }}
          >
            {state.lights.map((on, cell) => (
              <button
                key={`${state.level}:${cell}`}
                type="button"
                aria-pressed={on}
                aria-label={`Fila ${Math.floor(cell / state.size) + 1}, columna ${(cell % state.size) + 1}`}
                disabled={ended}
                onClick={() => tap(cell)}
                className="rounded-[22%] transition-[background-color,box-shadow,transform] duration-150 active:scale-95 disabled:active:scale-100"
                style={{
                  background: on ? "var(--t128)" : "var(--cell)",
                  boxShadow: on ? "0 0 18px -2px color-mix(in srgb, var(--t128) 70%, transparent)" : "none",
                }}
              />
            ))}
          </div>
          {levelUp !== null && !ended && (
            <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
              <p className="rounded-full bg-bg/85 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                ¡Nivel {levelUp} superado!
              </p>
            </div>
          )}
          {ended && <GameOver state={state} stopped={stopped} save={save} signedIn={signedIn} onRestart={() => void restart()} />}
        </div>
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-[22px]" style={{ background: "var(--board)" }} />
      )}

      <p aria-live="polite" className="sr-only">
        {ended ? `Partida terminada: ${state?.completed} niveles` : levelUp !== null ? `Nivel ${levelUp} superado` : ""}
      </p>

      {notice && <p className="text-sm text-muted">{notice}</p>}

      {!signedIn && (
        <p className="text-sm text-muted">
          Estás jugando sin cuenta.{" "}
          <Link href="/entrar?next=/lights-out" className="font-medium text-ink underline underline-offset-4">
            Entra
          </Link>{" "}
          para que tus partidas cuenten en el ranking.
        </p>
      )}

      <p className="text-sm text-muted">
        Cada casilla cambia ella y sus vecinas. Apágalo todo con {state ? budgetForLevel(state.level) : "las"} pulsaciones
        como mucho.
      </p>
    </section>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className={`tabular display text-4xl font-bold ${warn ? "text-danger" : ""}`}>{formatNumber(value)}</span>
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
  onRestart: () => void;
}) {
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
        <p className="text-muted">{stopped ? "Te has plantado" : "Sin pulsaciones"}</p>
        <p className="tabular display text-6xl font-bold">{formatNumber(state.completed)}</p>
        <p className="text-sm text-muted">{state.completed === 1 ? "nivel superado" : "niveles superados"}</p>
        {message && <p className="mt-1 text-sm">{message}</p>}
        <button type="button" onClick={onRestart} className="mt-3 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          Otra partida
        </button>
      </div>
    </div>
  );
}
