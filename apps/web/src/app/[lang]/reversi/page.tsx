import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchListSkeleton } from "@/components/tictactoe/match-list-skeleton";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { SignInPrompt } from "@/components/seo/sign-in-prompt";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("reversi", await getLocale());
}

export default async function ReversiPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["reversi"].title}</h1>
        <HowToPlayButton game="reversi" name={m.gameCards["reversi"].title} />
      </div>
      <p className="mb-8 text-muted">{m.gamePages["reversi"]}</p>
      <Suspense fallback={<MatchListSkeleton />}>
        <ListForViewer />
      </Suspense>
      <GameGuideSection id="reversi" />
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) return <SignInPrompt next="/reversi" />;
  return <MatchList viewerId={viewer.id} games={["reversi"]} />;
}
