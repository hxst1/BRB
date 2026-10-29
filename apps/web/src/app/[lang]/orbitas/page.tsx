import type { Metadata } from "next";
import { Suspense } from "react";
import { OrbitsGame } from "@/components/orbits/game";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("orbits", await getLocale());
}

export default async function OrbitsPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards.orbits.title}</h1>
          <HowToPlayButton game="orbits" name={m.gameCards.orbits.title} />
        </div>
        <p className="mb-8 text-muted">{m.gamePages.orbits}</p>
        <Suspense fallback={<div aria-hidden className="mt-[4.5rem] aspect-square w-full rounded-[22px]" style={{ background: "var(--board)" }} />}>
          <OrbitsForViewer />
        </Suspense>
      </div>
      <GameGuideSection id="orbits" />
    </main>
  );
}

async function OrbitsForViewer() {
  return <OrbitsGame viewerId={await getViewerId()} />;
}
