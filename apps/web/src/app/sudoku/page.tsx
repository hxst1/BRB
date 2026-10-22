import type { Metadata } from "next";
import { Suspense } from "react";
import { SudokuScreen } from "@/components/sudoku/screen";
import { getViewerId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sudoku",
  description: "Rellena el tablero sin repetir números en ninguna fila, columna ni caja. Gana el más rápido.",
};

export default function SudokuPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Sudoku</h1>
        <p className="mb-8 text-muted">Rellena el tablero sin repetir números en ninguna fila, columna ni caja. Gana el más rápido.</p>
      </div>
      <Suspense fallback={<div className="mx-auto aspect-square max-w-[30rem] animate-pulse rounded-[18px] bg-line/40 lg:mx-0" />}>
        <SudokuForViewer />
      </Suspense>
    </main>
  );
}

async function SudokuForViewer() {
  return <SudokuScreen viewerId={await getViewerId()} />;
}
