"use client";

import { useCallback, useState } from "react";
import { GAME_IDS, type Difficulty } from "@repo/games/sudoku";
import { Leaderboard } from "@/components/leaderboard";
import { formatTime } from "@/lib/format";
import { SudokuGame } from "./game";

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Medio" },
  { value: "hard", label: "Difícil" },
];

export function SudokuScreen({ viewerId }: { viewerId: string | null }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="mx-auto grid w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Dificultad" className="inline-flex self-start rounded-full bg-line/60 p-1">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={difficulty === level.value}
              onClick={() => setDifficulty(level.value)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                difficulty === level.value ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
        {/* La key reinicia el juego al cambiar de dificultad. */}
        <SudokuGame key={difficulty} viewerId={viewerId} difficulty={difficulty} onSaved={refresh} />
      </div>
      <Leaderboard game={GAME_IDS[difficulty]} viewerId={viewerId} refreshKey={refreshKey} formatScore={formatTime} />
    </div>
  );
}
