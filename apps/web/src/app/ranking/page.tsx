import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Quién tiene más nivel, quién va mejor en el 2048 y quién gana más partidas.",
};

export default function RankingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-6 text-5xl font-bold sm:text-6xl">Ranking</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-line/40" />}>
        <BoardForViewer />
      </Suspense>
    </main>
  );
}

async function BoardForViewer() {
  const viewer = await getViewer();
  return <RankingBoard viewerId={viewer?.id ?? null} />;
}
