import type { Metadata } from "next";
import { Suspense } from "react";
import { SnakeSkeleton, SoloScreenSkeleton } from "@/components/games/skeletons";
import { SnakeScreen } from "@/components/snake/screen";
import { getViewerId } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("snake", await getLocale());
}

export default async function SnakePage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["snake"].title}</h1>
          <HowToPlayButton game="snake" name={m.gameCards["snake"].title} />
        </div>
        <p className="mb-8 text-muted">{m.gamePages["snake"]}</p>
      </div>
      <Suspense
        fallback={
          <SoloScreenSkeleton picker={null}>
            <SnakeSkeleton />
          </SoloScreenSkeleton>
        }
      >
        <SnakeForViewer />
      </Suspense>
      <GameGuideSection id="snake" />
    </main>
  );
}

async function SnakeForViewer() {
  return <SnakeScreen viewerId={await getViewerId()} />;
}
