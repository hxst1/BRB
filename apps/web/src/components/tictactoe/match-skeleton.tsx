"use client";

import type { ReactNode } from "react";
import { EDGES, BOXES } from "@repo/games/dots";
import { WIN_SCORE } from "@repo/games/pong";
import { WIN_ROUNDS } from "@repo/games/tron";
import { SeaBoard } from "@/components/battleship/board";
import { Connect4Board } from "@/components/connect4/board";
import { DotsBoard } from "@/components/dots/board";
import { ReversiBoard } from "@/components/reversi/board";
import { ChoiceWheel } from "@/components/rps/choice-wheel";
import { Bone, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";
import { TicTacToeBoard } from "./board";

/*
 * Esqueletos de las partidas contra amigos (las páginas /juego/[id]): los dos
 * jugadores, el estado, el tablero vacío (el mismo componente, sin fichas y
 * sin poder jugar) y los botones de abajo. Sirven para el Suspense de cada
 * página y para el rato en que la partida llega del servidor.
 */

export type TurnGame = "tictactoe" | "connect4" | "reversi" | "dots" | "chess" | "rps" | "battleship";

const none = () => {};

/** Partida por turnos, con el tablero de su juego. */
export function MatchSkeleton({ game }: { game: TurnGame }) {
  const m = useMessages();
  const chess = game === "chess";
  return (
    <div aria-hidden inert className={`flex w-full flex-col ${chess ? "max-w-lg gap-5" : "max-w-md gap-6"}`}>
      {game === "rps" && <TextLine className="mx-auto w-40 text-sm" />}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <BadgeSkeleton />
        <span className="hidden shrink-0 text-sm text-muted sm:inline">{m.match.versus}</span>
        <BadgeSkeleton alignEnd />
      </div>
      <div className="flex justify-center">
        <TextLine className="display w-56 max-w-full text-3xl" />
      </div>
      <Board game={game} />
      <Actions />
    </div>
  );
}

function Board({ game }: { game: TurnGame }) {
  const m = useMessages();
  switch (game) {
    case "tictactoe":
      return (
        <div className="w-full">
          <TicTacToeBoard board={Array(9).fill(null)} line={null} canPlay={false} onPlay={none} />
        </div>
      );
    case "connect4":
      return (
        <div className="w-full">
          <Connect4Board board={Array(42).fill(null)} line={null} last={null} me="x" canPlay={false} onPlay={none} />
        </div>
      );
    case "reversi":
      return (
        <div className="w-full">
          <ReversiBoard board={Array(64).fill(null)} last={null} flipped={[]} me="x" canPlay={false} onPlay={none} />
        </div>
      );
    case "dots":
      return (
        <div className="w-full">
          <DotsBoard edges={Array(EDGES).fill(null)} boxes={Array(BOXES * BOXES).fill(null)} last={null} closed={[]} me="x" canPlay={false} onPlay={none} />
        </div>
      );
    case "chess":
      return (
        <div className="grid aspect-square w-full grid-cols-8 gap-[3px] rounded-[18px] p-1.5 sm:gap-1 sm:p-2" style={{ background: "var(--board)" }}>
          {Array.from({ length: 64 }, (_, square) => (
            <span
              key={square}
              className="aspect-square rounded-[22%]"
              style={{ background: ((square % 8) + Math.floor(square / 8)) % 2 === 1 ? "var(--chess-dark)" : "var(--chess-light)" }}
            />
          ))}
        </div>
      );
    case "rps":
      // En gris: aún no se sabe de qué color juegas.
      return (
        <div className="grayscale">
          <ChoiceWheel variant="rps" me="x" picked={null} canChoose={false} onChoose={none} />
        </div>
      );
    case "battleship":
      return (
        <div className="flex flex-col gap-2">
          <TextLine className="w-40 text-sm" />
          <SeaBoard label={m.battleship.yourFleet} fleet={null} shots={[]} />
        </div>
      );
  }
}

/** Un jugador: su monstruo en la cajita, el nombre y la ficha. */
function BadgeSkeleton({ alignEnd = false }: { alignEnd?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${alignEnd ? "flex-row-reverse" : ""}`}>
      <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-surface shadow-soft sm:size-16">
        <Bone className="size-10 rounded-full sm:size-12" />
      </span>
      <span className={`flex flex-col ${alignEnd ? "items-end" : "items-start"}`}>
        <TextLine className="w-16" />
        <TextLine className="w-4 text-lg leading-none" />
      </span>
    </div>
  );
}

/** Abajo: rendirse y volver a todas las partidas. */
function Actions() {
  const m = useMessages();
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span className="text-sm text-muted">{m.match.resign}</span>
      <span className="text-sm text-muted">{m.match.all}</span>
    </div>
  );
}

/**
 * Partida en directo (live/match-shell) mientras llega: el juego en marcha,
 * que es lo que se abre casi siempre. La carrera de tecleo, más ancha.
 */
export function LiveMatchSkeleton({ game }: { game: "pong" | "tron" | "typing" }) {
  const m = useMessages();
  let live: ReactNode;
  if (game === "pong") {
    live = (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <TextLine className="w-20 text-sm" />
          <TextLine className="display w-6 text-3xl" />
        </div>
        <span className="block aspect-[1/1.6] w-full rounded-3xl bg-[var(--board)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">{m.live.youTo(WIN_SCORE)}</span>
          <TextLine className="display w-6 text-3xl" />
        </div>
      </div>
    );
  } else if (game === "tron") {
    live = (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <TextLine className="display w-10 text-2xl" />
          <span className="text-xs text-muted">{m.live.toRounds(WIN_ROUNDS)}</span>
          <TextLine className="display w-10 text-2xl" />
        </div>
        <span className="block aspect-square w-full rounded-3xl" style={{ background: "var(--board)" }} />
        <TextLine className="mx-auto w-48 text-sm" />
      </div>
    );
  } else {
    live = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          {[0, 1].map((lane) => (
            <div key={lane} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <TextLine className="w-16" />
                <TextLine className="w-10" />
              </div>
              <div className="h-3 rounded-full bg-line/60" />
            </div>
          ))}
        </div>
        {/* El texto no llega hasta que empieza la carrera: antes, la caja mide una línea. */}
        <div className="rounded-3xl bg-surface p-4 text-lg leading-relaxed shadow-soft sm:p-5 sm:text-xl">
          <TextLine className="mx-auto w-48 max-w-full" />
        </div>
        <span className="block h-[5.25rem] rounded-2xl border-2 border-line bg-surface" />
        <span className="min-h-5" />
      </div>
    );
  }
  return (
    <div aria-hidden inert className={`flex w-full flex-col gap-4 ${game === "typing" ? "max-w-xl" : "max-w-sm"}`}>
      {live}
      <Actions />
    </div>
  );
}
