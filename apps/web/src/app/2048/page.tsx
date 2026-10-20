import type { Metadata } from "next";
import { Suspense } from "react";
import { Game2048Screen } from "@/components/game2048/screen";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "2048",
  description: "Junta fichas iguales hasta llegar a 2048.",
};

export default function Game2048Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">2048</h1>
      <p className="mb-8 text-muted">Junta fichas iguales hasta llegar a 2048.</p>
      <Suspense fallback={<div className="board max-w-[30rem] animate-pulse" />}>
        <GameForViewer />
      </Suspense>
    </main>
  );
}

async function GameForViewer() {
  const viewer = await getViewer();
  return <Game2048Screen viewerId={viewer?.id ?? null} />;
}
