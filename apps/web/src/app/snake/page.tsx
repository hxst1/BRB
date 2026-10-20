import type { Metadata } from "next";
import { Suspense } from "react";
import { SnakeScreen } from "@/components/snake/screen";
import { getViewerId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Snake",
  description: "Come manzanas sin chocar. Cada una te hace más largo y más rápido.",
};

export default function SnakePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Snake</h1>
        <p className="mb-8 text-muted">Come manzanas sin chocar. Cada una te hace más largo y más rápido.</p>
      </div>
      <Suspense fallback={<div className="mx-auto aspect-square max-w-[30rem] animate-pulse rounded-[22px] bg-line/40 lg:mx-0" />}>
        <SnakeForViewer />
      </Suspense>
    </main>
  );
}

async function SnakeForViewer() {
  return <SnakeScreen viewerId={await getViewerId()} />;
}
