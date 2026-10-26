"use client";

import { useCallback, useState } from "react";
import { GAME_ID } from "@repo/games/solitaire";
import { Leaderboard } from "@/components/leaderboard";
import { useMessages } from "@/lib/i18n/client";
import { SolitaireGame } from "./game";

export function SolitaireScreen({ viewerId }: { viewerId: string | null }) {
  const m = useMessages();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <SolitaireGame viewerId={viewerId} onSaved={refresh} />
      <Leaderboard game={GAME_ID} viewerId={viewerId} refreshKey={refreshKey} formatScore={m.format.time} />
    </div>
  );
}
