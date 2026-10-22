import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { SignInPrompt } from "@/components/seo/sign-in-prompt";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";

export const metadata: Metadata = gameMetadata("tictactoe");

export default function TicTacToePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-6xl font-bold sm:text-7xl">3 en raya</h1>
        <HowToPlayButton game="tictactoe" name="3 en raya" />
      </div>
      <p className="mb-8 text-muted">Reta a tus amigos. Cada uno juega cuando puede.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
      <GameGuideSection id="tictactoe" />
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) return <SignInPrompt next="/3-en-raya" />;
  return <MatchList viewerId={viewer.id} games={["tictactoe"]} />;
}
