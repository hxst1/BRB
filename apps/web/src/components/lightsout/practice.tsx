"use client";

import { useState } from "react";
import { randomSeed } from "@repo/games";
import { newGame, press, type LightsOutState } from "@repo/games/lightsout";
import { useMessages } from "@/lib/i18n/client";
import { playSound } from "@/lib/sound";
import { LightsBoard } from "./board";

/** Hasta qué nivel se puede elegir (desde el 9, el tablero ya es de 7 × 7 y solo crecen las luces). */
const MAX_LEVEL = 30;

/** Sin límite de pulsaciones: el estado de la partida, con pulsaciones infinitas. */
const unlimited = (state: LightsOutState): LightsOutState => ({ ...state, pressesLeft: Number.POSITIVE_INFINITY });

/**
 * Modo práctica: sin límite de pulsaciones, empezando por el nivel que se
 * quiera, con deshacer y reiniciar. No cuenta para el ranking (no hay partida
 * en el servidor).
 */
export function LightsOutPractice() {
  const m = useMessages();
  const t = m.lightsOut.practice;
  const [state, setState] = useState(() => unlimited(newGame(randomSeed())));
  /** Tablero al empezar el nivel, para reiniciarlo. */
  const [start, setStart] = useState(state);
  const [history, setHistory] = useState<LightsOutState[]>([]);

  function load(next: LightsOutState) {
    const fresh = unlimited(next);
    setState(fresh);
    setStart(fresh);
    setHistory([]);
  }

  function tap(cell: number) {
    const next = unlimited(press(state, cell));
    if (next.level > state.level) {
      playSound("level");
      load(next);
      return;
    }
    playSound("tap");
    setHistory((past) => [...past.slice(-99), state]);
    setState(next);
  }

  const changeLevel = (level: number) => load(newGame(randomSeed(), Math.min(Math.max(level, 1), MAX_LEVEL)));
  const lit = state.lights.filter(Boolean).length;
  const used = state.presses.length - start.presses.length;
  const button = "flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft transition-colors hover:border-muted disabled:opacity-40";

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-muted">{m.lightsOut.level}</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => changeLevel(state.level - 1)} disabled={state.level <= 1} aria-label={t.easier} className="grid size-8 place-items-center rounded-full border border-line bg-surface text-lg leading-none disabled:opacity-40">
                −
              </button>
              <span className="tabular display min-w-8 text-center text-4xl font-bold">{state.level}</span>
              <button type="button" onClick={() => changeLevel(state.level + 1)} disabled={state.level >= MAX_LEVEL} aria-label={t.harder} className="grid size-8 place-items-center rounded-full border border-line bg-surface text-lg leading-none disabled:opacity-40">
                +
              </button>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted">{m.lightsOut.presses}</span>
            <span className="tabular display text-4xl font-bold">{used}</span>
          </div>
        </div>
      </div>

      <LightsBoard key={`${state.seed}-${state.level}`} lights={state.lights} size={state.size} label={m.lightsOut.boardAria(state.level, lit)} disabled={false} onTap={tap} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setState(history.at(-1)!);
            setHistory((past) => past.slice(0, -1));
          }}
          disabled={history.length === 0}
          className={button}
        >
          {m.sudoku.undo}
        </button>
        <button type="button" onClick={() => load(start)} disabled={history.length === 0} className={button}>
          {t.restart}
        </button>
        <button type="button" onClick={() => changeLevel(state.level)} className={button}>
          {t.newBoard}
        </button>
      </div>

      <p className="text-sm text-muted">{t.hint}</p>
    </section>
  );
}
