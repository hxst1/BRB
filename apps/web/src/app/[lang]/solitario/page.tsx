import type { Metadata } from "next";
import { Suspense } from "react";
import { SolitaireScreen } from "@/components/solitaire/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("solitaire", await getLocale());
}

export default async function SolitairePage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["solitaire"].title}</h1>
          <HowToPlayButton game="solitaire" name={m.gameCards["solitaire"].title} />
        </div>
        <p className="mb-8 text-muted">{m.gamePages["solitaire"]}</p>
      </div>
      <Suspense fallback={<div className="mx-auto aspect-[4/5] max-w-[30rem] animate-pulse rounded-[18px] bg-line/40 lg:mx-0" />}>
        <SolitaireForViewer />
      </Suspense>
      <GameGuideSection id="solitaire" />
    </main>
  );
}

async function SolitaireForViewer() {
  return <SolitaireScreen viewerId={await getViewerId()} />;
}
