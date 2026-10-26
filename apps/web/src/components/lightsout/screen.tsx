"use client";

import { useCallback, useState } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { LightsOutGame } from "./game";

export function LightsOutScreen({ viewerId }: { viewerId: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <LightsOutGame viewerId={viewerId} onSaved={refresh} />
      <Leaderboard game="lightsout" viewerId={viewerId} refreshKey={refreshKey} />
    </div>
  );
}
