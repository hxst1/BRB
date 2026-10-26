"use client";

import { useCallback, useState } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { ModePicker, type Mode } from "@/components/mode-picker";
import { LightsOutGame } from "./game";
import { LightsOutPractice } from "./practice";

export function LightsOutScreen({ viewerId }: { viewerId: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<Mode>("game");
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-4">
        <ModePicker mode={mode} onChange={setMode} />
        {mode === "game" ? <LightsOutGame viewerId={viewerId} onSaved={refresh} /> : <LightsOutPractice />}
      </div>
      <Leaderboard game="lightsout" viewerId={viewerId} refreshKey={refreshKey} />
    </div>
  );
}
