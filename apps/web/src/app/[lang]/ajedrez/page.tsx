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
  return gameMetadata("chess", await getLocale());
}

export default async function ChessPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["chess"].title}</h1>
        <HowToPlayButton game="chess" name={m.gameCards["chess"].title} />
      </div>
      <p className="mb-8 text-muted">{m.gamePages["chess"]}</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
      <GameGuideSection id="chess" />
      <p className="mt-8 text-xs text-muted">
        {m.chess.credits}{" "}
        <a href="https://github.com/neverRare" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          neverRare
        </a>{" "}
        (
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          CC BY 4.0
        </a>
        ){m.chess.creditsChanges}
      </p>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) return <SignInPrompt next="/ajedrez" />;
  return <MatchList viewerId={viewer.id} games={["chess"]} />;
}
