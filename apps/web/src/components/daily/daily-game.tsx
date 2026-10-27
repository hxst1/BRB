"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { LightsOutGame } from "@/components/lightsout/game";
import { MinesweeperGame } from "@/components/minesweeper/game";
import { QueensGame } from "@/components/queens/game";
import { SolitaireGame } from "@/components/solitaire/game";
import { SnakeGame } from "@/components/snake/game";
import { SudokuGame } from "@/components/sudoku/game";
import { DAILY_GAMES } from "@/lib/daily";
import { useMessages } from "@/lib/i18n/client";

/**
 * El juego de un reto de hoy (salvo el 2048, que tiene su propia pantalla) con
 * el ranking del día. Al guardar la partida, la página pasa a enseñar el
 * resultado.
 */
export function DailyGame({ game, day, viewerId }: { game: string; day: string; viewerId: string }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const onSaved = useCallback(() => {
    setRefreshKey((key) => key + 1);
    // Un momento para ver el final de la partida antes del resultado.
    setTimeout(() => router.refresh(), 1800);
  }, [router]);

  const board =
    game === "snake" ? (
      <SnakeGame viewerId={viewerId} daily={day} onSaved={onSaved} />
    ) : game === "lightsout" ? (
      <LightsOutGame viewerId={viewerId} daily={day} onSaved={onSaved} />
    ) : game === "minesweeper-medium" ? (
      <MinesweeperGame viewerId={viewerId} difficulty="medium" daily={day} onSaved={onSaved} />
    ) : game === "sudoku-medium" ? (
      <SudokuGame viewerId={viewerId} difficulty="medium" daily={day} onSaved={onSaved} />
    ) : game === "queens-medium" ? (
      <QueensGame viewerId={viewerId} difficulty="medium" daily={day} onSaved={onSaved} />
    ) : game === "solitaire" ? (
      <SolitaireGame viewerId={viewerId} daily={day} onSaved={onSaved} />
    ) : null;

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-4">{board}</div>
      <DailyLeaderboard game={game} viewerId={viewerId} refreshKey={refreshKey} />
    </div>
  );
}

/** Ranking del reto de hoy, con el formato de su juego (tiempo o puntos). */
export function DailyLeaderboard({ game, viewerId, refreshKey = 0 }: { game: string; viewerId: string | null; refreshKey?: number }) {
  const m = useMessages();
  return (
    <Leaderboard
      game={game}
      daily
      viewerId={viewerId}
      refreshKey={refreshKey}
      formatScore={DAILY_GAMES[game]?.time ? m.format.time : m.format.number}
    />
  );
}
