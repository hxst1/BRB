"use client";

import { useState, useSyncExternalStore } from "react";
import { toggle } from "@repo/games/lightsout";
import { useMessages } from "@/lib/i18n/client";
import { LightsBoard } from "./board";

const SIZE = 3;
const DONE_KEY = "lightsout:tutorial";

/** Cada paso: el tablero sale de pulsar `solution` sobre uno apagado; `guided` resalta qué tocar. */
const STEPS: { solution: number[]; guided: boolean }[] = [
  { solution: [4], guided: true },
  { solution: [0, 8], guided: true },
  { solution: [1, 3, 4], guided: false },
];

function boardFor(solution: number[]): boolean[] {
  return solution.reduce((lights, cell) => toggle(lights, SIZE, cell), Array<boolean>(SIZE * SIZE).fill(false));
}

// ¿Ha hecho (o saltado) el tutorial en este dispositivo? Se guarda en el navegador.
const listeners = new Set<() => void>();
function readDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "done";
  } catch {
    return true;
  }
}
function markDone() {
  try {
    localStorage.setItem(DONE_KEY, "done");
  } catch {
    // Sin almacenamiento: se juega igual; la próxima vez volverá a salir.
  }
  listeners.forEach((listener) => listener());
}

/** true si ya hizo el tutorial; null mientras se sabe (en el servidor). */
export function useTutorialDone(): boolean | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readDone,
    () => null,
  );
}

/**
 * Tutorial de Lights Out: tres tableros pequeños que enseñan las reglas
 * jugando (qué cambia cada toque, que el orden no importa y que tocar otra
 * vez deshace). No cuenta para nada; sale la primera vez y desde "Repasar".
 */
export function LightsOutTutorial({ onDone }: { onDone: () => void }) {
  const m = useMessages();
  const t = m.lightsOut.tutorial;
  const [step, setStep] = useState(0);
  const [lights, setLights] = useState(() => boardFor(STEPS[0]!.solution));
  /** Veces que se ha tocado cada casilla en este paso (para saber qué falta). */
  const [taps, setTaps] = useState<number[]>(() => Array(SIZE * SIZE).fill(0));
  const finished = step === STEPS.length;
  const solved = !finished && !lights.some(Boolean);
  const current = STEPS[step];

  function tap(cell: number) {
    if (solved) return;
    setLights((value) => toggle(value, SIZE, cell));
    setTaps((value) => value.map((n, i) => (i === cell ? n + 1 : n)));
  }

  function next() {
    const following = step + 1;
    setStep(following);
    setTaps(Array(SIZE * SIZE).fill(0));
    if (following < STEPS.length) setLights(boardFor(STEPS[following]!.solution));
  }

  function finish() {
    markDone();
    onDone();
  }

  // Lo que falta por tocar: las casillas de la solución tocadas un número par de veces, y viceversa.
  const targets =
    current?.guided && !solved
      ? new Set(Array.from({ length: SIZE * SIZE }, (_, cell) => cell).filter((cell) => current.solution.includes(cell) !== (taps[cell]! % 2 === 1)))
      : undefined;

  return (
    <section aria-labelledby="tutorial-title" className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{finished ? t.ready : t.step(step + 1, STEPS.length)}</p>
        {!finished && (
          <button type="button" onClick={finish} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            {t.skip}
          </button>
        )}
      </div>

      {finished ? (
        <div className="flex flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-soft">
          <h2 id="tutorial-title" className="display text-3xl font-bold">
            {t.doneTitle}
          </h2>
          <p className="text-muted">{t.doneBody}</p>
          <button type="button" onClick={finish} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {t.start}
          </button>
        </div>
      ) : (
        <>
          <div>
            <h2 id="tutorial-title" className="display text-3xl font-bold">
              {t.steps[step]!.title}
            </h2>
            <p className="text-muted">{t.steps[step]!.body}</p>
          </div>
          <div className="relative mx-auto w-full max-w-[18rem]">
            <LightsBoard lights={lights} size={SIZE} label={t.steps[step]!.title} targets={targets} disabled={solved} onTap={tap} />
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            {solved ? (
              <>
                <p className="font-semibold">{t.nice}</p>
                <button type="button" onClick={next} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
                  {t.next}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">{t.steps[step]!.hint}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
