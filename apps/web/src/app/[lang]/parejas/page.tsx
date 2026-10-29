import type { Metadata } from "next";
import { Suspense } from "react";
import { PairsScreen } from "@/components/pairs/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("pairs", await getLocale());
}

export default async function PairsPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards.pairs.title}</h1>
          <HowToPlayButton game="pairs" name={m.gameCards.pairs.title} />
        </div>
        <p className="mb-8 text-muted">{m.gamePages.pairs}</p>
      </div>
      <Suspense fallback={<div aria-hidden className="mx-auto aspect-[4/5] w-full max-w-[30rem] rounded-[22px] lg:mx-0" style={{ background: "var(--board)" }} />}>
        <PairsForViewer />
      </Suspense>
      <GameGuideSection id="pairs" />
    </main>
  );
}

async function PairsForViewer() {
  return <PairsScreen viewerId={await getViewerId()} />;
}
