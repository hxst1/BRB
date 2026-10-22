import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";
import { GameGuideSection } from "@/components/seo/game-guide";
import { SignInPrompt } from "@/components/seo/sign-in-prompt";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";

export const metadata: Metadata = gameMetadata("rps");

export default function RpsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-5xl font-bold text-balance sm:text-7xl">Piedra, papel o tijera</h1>
        <HowToPlayButton game="rps" name="Piedra, papel o tijera" />
      </div>
      <p className="mb-8 text-muted">Al mejor de 3. Cada uno elige en secreto. Con lagarto y Spock si os atrevéis.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
      <GameGuideSection id="rps" />
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) return <SignInPrompt next="/piedra-papel-tijera" />;
  return <MatchList viewerId={viewer.id} games={["rps", "rpsls"]} />;
}
