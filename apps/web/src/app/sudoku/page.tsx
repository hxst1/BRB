import type { Metadata } from "next";
import { Suspense } from "react";
import { SudokuScreen } from "@/components/sudoku/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";

export const metadata: Metadata = gameMetadata("sudoku");

export default function SudokuPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">Sudoku</h1>
          <HowToPlayButton game="sudoku" name="Sudoku" />
        </div>
        <p className="mb-8 text-muted">Rellena el tablero sin repetir números en ninguna fila, columna ni caja. Gana el más rápido.</p>
      </div>
      <Suspense fallback={<div className="mx-auto aspect-square max-w-[30rem] animate-pulse rounded-[18px] bg-line/40 lg:mx-0" />}>
        <SudokuForViewer />
      </Suspense>
      <GameGuideSection id="sudoku" />
    </main>
  );
}

async function SudokuForViewer() {
  return <SudokuScreen viewerId={await getViewerId()} />;
}
