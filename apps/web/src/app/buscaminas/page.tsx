import type { Metadata } from "next";
import { Suspense } from "react";
import { MinesweeperScreen } from "@/components/minesweeper/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("minesweeper");

export default function MinesweeperPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Buscaminas</h1>
        <p className="mb-8 text-muted">Despeja el tablero sin pisar ninguna mina, lo más rápido que puedas.</p>
      </div>
      <Suspense fallback={<div className="mx-auto aspect-square max-w-[30rem] animate-pulse rounded-[18px] bg-line/40 lg:mx-0" />}>
        <MinesweeperForViewer />
      </Suspense>
      <GameGuideSection id="minesweeper" />
    </main>
  );
}

async function MinesweeperForViewer() {
  return <MinesweeperScreen viewerId={await getViewerId()} />;
}
