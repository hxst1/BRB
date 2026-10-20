"use client";

import { useCallback, useState } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { Game2048 } from "./game";

export function Game2048Screen({ viewerId }: { viewerId: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <Game2048 signedIn={viewerId !== null} onSaved={refresh} />
      <Leaderboard game="2048" viewerId={viewerId} refreshKey={refreshKey} />
    </div>
  );
}
