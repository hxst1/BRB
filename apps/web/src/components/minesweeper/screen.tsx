"use client";

import { useCallback, useState } from "react";
import { GAME_IDS, type Difficulty } from "@repo/games/minesweeper";
import { Leaderboard } from "@/components/leaderboard";
import { useMessages } from "@/lib/i18n/client";
import { MinesweeperGame } from "./game";

const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

export function MinesweeperScreen({ viewerId }: { viewerId: string | null }) {
  const m = useMessages();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label={m.levels.label} className="inline-flex self-start rounded-full bg-line/60 p-1">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={difficulty === level}
              onClick={() => setDifficulty(level)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                difficulty === level ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
              }`}
            >
              {m.levels[level]}
            </button>
          ))}
        </div>
        {/* La key reinicia el juego al cambiar de dificultad. */}
        <MinesweeperGame key={difficulty} viewerId={viewerId} difficulty={difficulty} onSaved={refresh} />
      </div>
      <Leaderboard game={GAME_IDS[difficulty]} viewerId={viewerId} refreshKey={refreshKey} formatScore={m.format.time} />
    </div>
  );
}
