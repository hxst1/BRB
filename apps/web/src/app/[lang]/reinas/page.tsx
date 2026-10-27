import type { Metadata } from "next";
import { Suspense } from "react";
import { QueensSkeleton, SoloScreenSkeleton } from "@/components/games/skeletons";
import { QueensScreen } from "@/components/queens/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("queens", await getLocale());
}

export default async function QueensPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["queens"].title}</h1>
          <HowToPlayButton game="queens" name={m.gameCards["queens"].title} />
        </div>
        <p className="mb-8 text-muted">{m.gamePages["queens"]}</p>
      </div>
      <Suspense
        fallback={
          <SoloScreenSkeleton picker="levels">
            <QueensSkeleton />
          </SoloScreenSkeleton>
        }
      >
        <QueensForViewer />
      </Suspense>
      <GameGuideSection id="queens" />
    </main>
  );
}

async function QueensForViewer() {
  return <QueensScreen viewerId={await getViewerId()} />;
}
