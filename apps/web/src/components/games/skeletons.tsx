"use client";

import type { CSSProperties, ReactNode } from "react";
import { GuestNotice } from "@/components/guest-notice";
import { LeaderboardSkeleton } from "@/components/leaderboard";
import { SessionHint, TextLine, ToggleSkeleton } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/*
 * Esqueletos de los juegos en solitario: el marcador con sus etiquetas, el
 * tablero vacío (las mismas casillas, del mismo tamaño), los botones y el
 * ranking al lado. Sirven para el Suspense de cada página y para el rato en
 * que el juego pide la partida al servidor.
 *
 * `signedIn`: si ya se sabe; si no (en el Suspense), el aviso de jugar sin
 * cuenta sale según la pista de sesión (lib/session-hint.ts).
 */

type Picker = "levels" | "modes" | null;

/** La pantalla de un juego (screen.tsx de cada uno): selector, juego y ranking. */
export function SoloScreenSkeleton({ picker, children }: { picker: Picker; children: ReactNode }) {
  const m = useMessages();
  return (
    <div aria-hidden className="mx-auto grid w-full max-w-[30rem] grid-cols-1 gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <SessionHint />
      <div className="flex flex-col gap-4">
        {picker === "levels" && <ToggleSkeleton options={[m.levels.easy, m.levels.medium, m.levels.hard]} />}
        {picker === "modes" && <ToggleSkeleton options={[m.modes.game, m.modes.practice]} />}
        {children}
      </div>
      <LeaderboardSkeleton />
    </div>
  );
}

/** Marcador de arriba: etiquetas de verdad y los números en gris; a la derecha, los botones. */
function Scoreboard({ labels, gap = "gap-6", children }: { labels: string[]; gap?: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className={`flex items-end ${gap}`}>
        {labels.map((label) => (
          <div key={label} className="flex flex-col">
            <span className="text-xs text-muted">{label}</span>
            <TextLine className="display w-10 text-4xl" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/** Un botón de los de borde (Nueva partida, Deshacer…), igual que el de verdad. */
function PillButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full border border-line bg-surface px-4 py-2 text-center text-sm font-medium shadow-soft ${className}`}>
      {children}
    </span>
  );
}

function PauseSkeleton() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface shadow-soft">
      <svg viewBox="0 0 16 16" className="size-4">
        <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Debajo del juego: el aviso de jugar sin cuenta (si no hay sesión) y la ayuda. */
function Footer({ signedIn, next, hint, hintClass = "" }: { signedIn?: boolean; next: string; hint: ReactNode; hintClass?: string }) {
  return (
    <>
      {/* inert: sus enlaces no se pueden usar hasta que llega el juego. */}
      {signedIn === undefined ? (
        <div inert className="signed-in:hidden">
          <GuestNotice next={next} />
        </div>
      ) : (
        !signedIn && (
          <div inert className="flex flex-col">
            <GuestNotice next={next} />
          </div>
        )
      )}
      <p className={`text-sm text-muted ${hintClass}`}>{hint}</p>
    </>
  );
}

/** El tablero del 2048 sin fichas. */
export function EmptyBoard2048() {
  return (
    <div aria-hidden className="board">
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} className="board-cell" style={{ "--x": i % 4, "--y": Math.floor(i / 4) } as CSSProperties} />
      ))}
    </div>
  );
}

export function Game2048Skeleton({ signedIn }: { signedIn?: boolean }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <div className="flex flex-col gap-4">
        <Scoreboard labels={[m.run.points, m.run.yourRecord]}>
          <PillButton>{m.run.newGame}</PillButton>
        </Scoreboard>
        <EmptyBoard2048 />
      </div>
      <Footer signedIn={signedIn} next="/2048" hint={m.game2048.controls} hintClass="hidden sm:block" />
    </div>
  );
}

export function SudokuSkeleton({ signedIn }: { signedIn?: boolean }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <Scoreboard labels={[m.minesweeper.time]}>
        <PauseSkeleton />
        <PillButton>{m.sudoku.newSudoku}</PillButton>
      </Scoreboard>
      <div className="sudoku-grid">
        {Array.from({ length: 9 }, (_, b) => (
          <div key={b} className="sudoku-box">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="sudoku-cell" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="aspect-[3/4] rounded-xl bg-surface shadow-soft" />
          ))}
        </div>
        <div className="flex gap-2">
          <PillButton className="flex-1">{m.sudoku.notesOff}</PillButton>
          <PillButton className="flex-1">{m.sudoku.erase}</PillButton>
          <PillButton className="flex-1 opacity-40">{m.sudoku.undo}</PillButton>
        </div>
      </div>
      <Footer signedIn={signedIn} next="/sudoku" hint={m.sudoku.keyboard} hintClass="hidden sm:block" />
    </div>
  );
}

/** Buscaminas en fácil (9 × 9), la dificultad con la que se abre. */
export function MinesweeperSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <Scoreboard labels={[m.minesweeper.mines, m.minesweeper.time]}>
        <PillButton className="flex items-center gap-2">
          <span className="size-[1em]" />
          {m.minesweeper.flagMode}
        </PillButton>
      </Scoreboard>
      <div className="grid grid-cols-9 gap-[2px] rounded-[18px] p-1.5" style={{ background: "var(--board)" }}>
        {Array.from({ length: 81 }, (_, i) => (
          <span key={i} className="aspect-square rounded-[22%]" style={{ background: "var(--cell)" }} />
        ))}
      </div>
      <Footer next="/buscaminas" hint={m.minesweeper.hint} />
    </div>
  );
}

/** Reinas en fácil (7 × 7); las regiones, de un solo color hasta que llega el tablero. */
export function QueensSkeleton({ signedIn, size = 7 }: { signedIn?: boolean; size?: number }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <Scoreboard labels={[m.minesweeper.time]}>
        <PauseSkeleton />
        <PillButton>{m.queens.newBoard}</PillButton>
      </Scoreboard>
      <div
        className="grid gap-px overflow-hidden rounded-[18px]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, border: "3px solid var(--board)", background: "var(--board)" }}
      >
        {Array.from({ length: size * size }, (_, i) => (
          <span key={i} className="aspect-square" style={{ background: "var(--cell)" }} />
        ))}
      </div>
      <div className="flex gap-2">
        <PillButton className="flex-1 opacity-40">{m.queens.clear}</PillButton>
        <PillButton className="flex-1 opacity-40">{m.sudoku.undo}</PillButton>
      </div>
      <Footer signedIn={signedIn} next="/reinas" hint={m.queens.hint} />
    </div>
  );
}

/**
 * Solitario recién repartido: el mazo, los huecos y las siete columnas con
 * sus cartas tapadas; las destapadas, en gris. Mismas medidas que measure()
 * en solitaire/game.tsx (el tablero mide 0,8385 veces su ancho).
 */
export function SolitaireSkeleton({ signedIn }: { signedIn?: boolean }) {
  const m = useMessages();
  const t = m.solitaire;
  // En % del ancho (left, width) y del alto (top, height) del tablero.
  const column = (c: number) => `${c * 14.543}%`;
  const card = { width: "12.743%", height: "21.28%" };
  const top = 27.72;
  const step = 2.766;
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <Scoreboard labels={[m.minesweeper.time, t.movesLabel]} gap="gap-5">
        <PauseSkeleton />
        <PillButton>{t.newGame}</PillButton>
      </Scoreboard>
      <div className="solitaire relative aspect-[1/0.8385] w-full">
        <span className="solitaire-card solitaire-back absolute" style={{ left: column(0), top: 0, ...card }} />
        {[3, 4, 5, 6].map((c) => (
          <span key={c} className="solitaire-slot absolute" style={{ left: column(c), top: 0, ...card }} />
        ))}
        {Array.from({ length: 7 }, (_, c) => (
          <span key={c}>
            {Array.from({ length: c }, (_, i) => (
              <span key={i} className="solitaire-card solitaire-back absolute" style={{ left: column(c), top: `${top + i * step}%`, ...card }} />
            ))}
            <span className="solitaire-slot absolute shadow-soft" style={{ left: column(c), top: `${top + c * step}%`, ...card }} />
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <PillButton className="flex-1 opacity-40">{m.sudoku.undo}</PillButton>
      </div>
      <Footer signedIn={signedIn} next="/solitario" hint={t.hint} />
    </div>
  );
}

export function SnakeSkeleton({ signedIn }: { signedIn?: boolean }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <Scoreboard labels={[m.run.points, m.run.yourRecord]}>
        <PillButton>{m.run.newGame}</PillButton>
      </Scoreboard>
      <SnakeBoardSkeleton />
      <Footer signedIn={signedIn} next="/snake" hint={m.game2048.controls} hintClass="hidden sm:block" />
    </div>
  );
}

/** El campo de Snake vacío y, en pantallas táctiles, la cruceta. */
export function SnakeBoardSkeleton() {
  return (
    <>
      <span className="block aspect-square w-full rounded-[22px]" style={{ background: "var(--board)" }} />
      <span className="hidden grid-cols-[repeat(3,4rem)] justify-center gap-2 pointer-coarse:grid">
        <span className="col-start-2 size-16 rounded-2xl bg-surface shadow-soft" />
        <span className="col-start-1 row-start-2 size-16 rounded-2xl bg-surface shadow-soft" />
        <span className="col-start-2 row-start-2 size-16 rounded-2xl bg-surface shadow-soft" />
        <span className="col-start-3 row-start-2 size-16 rounded-2xl bg-surface shadow-soft" />
      </span>
    </>
  );
}

export function LightsOutSkeleton({ signedIn }: { signedIn?: boolean }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex w-full max-w-[30rem] flex-col gap-4">
      <Scoreboard labels={[m.lightsOut.level, m.lightsOut.presses, m.run.yourRecord]}>
        <PillButton>{m.run.newGame}</PillButton>
      </Scoreboard>
      <span className="block aspect-square w-full rounded-[22px]" style={{ background: "var(--board)" }} />
      <Footer signedIn={signedIn} next="/lights-out" hint={m.lightsOut.hint(null)} />
    </div>
  );
}
