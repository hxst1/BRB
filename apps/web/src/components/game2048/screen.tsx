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

export function Game2048Screen({ viewerId, challenge }: { viewerId: string | null; challenge: ActiveChallenge | null }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const exitChallenge = useCallback(() => router.replace("/2048"), [router]);

  return (
    <div className="mx-auto grid w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      {/* La key reinicia el juego al entrar o salir de un reto. */}
      <Game2048
        key={challenge?.id ?? "normal"}
        viewerId={viewerId}
        challenge={challenge}
        onSaved={refresh}
        onExitChallenge={exitChallenge}
      />
      <div className="flex flex-col gap-12">
        <Leaderboard game="2048" viewerId={viewerId} refreshKey={refreshKey} />
        {viewerId && <ChallengesList refreshKey={refreshKey} />}
      </div>
    </div>
  );
}
