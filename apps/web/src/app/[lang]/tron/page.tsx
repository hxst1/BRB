import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { SignInPrompt } from "@/components/seo/sign-in-prompt";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("tron", await getLocale());
}

export default async function TronPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["tron"].title}</h1>
        <HowToPlayButton game="tron" name={m.gameCards["tron"].title} />
      </div>
      <p className="mb-8 text-muted">{m.gamePages["tron"]}</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
      <GameGuideSection id="tron" />
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) return <SignInPrompt next="/tron" />;
  return <MatchList viewerId={viewer.id} games={["tron"]} />;
}
