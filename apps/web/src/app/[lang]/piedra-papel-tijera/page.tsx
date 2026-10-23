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
  return gameMetadata("rps", await getLocale());
}

export default async function RpsPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-5xl font-bold text-balance sm:text-7xl">{m.gameCards["rps"].title}</h1>
        <HowToPlayButton game="rps" name={m.gameCards["rps"].title} />
      </div>
      <p className="mb-8 text-muted">{m.gamePages["rps"]}</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
      <GameGuideSection id="rps" />
      <p className="mt-8 text-xs text-muted">
        {m.rps.credits}{" "}
        <a href="https://openmoji.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          OpenMoji
        </a>{" "}
        (
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          CC BY-SA 4.0
        </a>
        ){m.rps.creditsChanges}
      </p>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) return <SignInPrompt next="/piedra-papel-tijera" />;
  return <MatchList viewerId={viewer.id} games={["rps", "rpsls"]} />;
}
