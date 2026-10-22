import type { Metadata } from "next";
import { Suspense } from "react";
import { LightsOutScreen } from "@/components/lightsout/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("lights-out");

export default function LightsOutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Lights Out</h1>
        <p className="mb-8 text-muted">Apaga todas las luces. Cada nivel, un tablero más grande y menos margen.</p>
      </div>
      <Suspense fallback={<div className="mx-auto aspect-square max-w-[30rem] animate-pulse rounded-[22px] bg-line/40 lg:mx-0" />}>
        <LightsOutForViewer />
      </Suspense>
      <GameGuideSection id="lights-out" />
    </main>
  );
}

async function LightsOutForViewer() {
  return <LightsOutScreen viewerId={await getViewerId()} />;
}
