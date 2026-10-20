"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { Json } from "@repo/db";
import { Leaderboard } from "@/components/leaderboard";
import { ChallengesList } from "./challenges-list";
import { Game2048 } from "./game";

export type ActiveChallenge = {
  id: string;
  targetScore: number;
  challenger: { username: string; avatar_seed: number; avatar_parts: Json };
};

export function Game2048Screen({
  viewerId,
  challenge,
  daily = false,
}: {
  viewerId: string | null;
  challenge: ActiveChallenge | null;
  daily?: boolean;
}) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const exit = useCallback(() => (daily ? router.push("/2048") : router.replace("/2048")), [daily, router]);

  return (
    <div className="mx-auto grid w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      {/* La key reinicia el juego al entrar o salir de un reto. */}
      <Game2048
        key={challenge?.id ?? (daily ? "daily" : "normal")}
        viewerId={viewerId}
        challenge={challenge}
        daily={daily}
        onSaved={refresh}
        onExit={exit}
      />
      <div className="flex flex-col gap-12">
        <Leaderboard game="2048" daily={daily} viewerId={viewerId} refreshKey={refreshKey} />
        {viewerId && !daily && <ChallengesList refreshKey={refreshKey} />}
      </div>
    </div>
  );
}
