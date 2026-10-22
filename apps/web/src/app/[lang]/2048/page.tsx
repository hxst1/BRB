import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Game2048Screen, type ActiveChallenge } from "@/components/game2048/screen";
import { PLAYER_COLUMNS } from "@/lib/queries";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getMessages } from "@/lib/i18n/server";

export const metadata: Metadata = gameMetadata("2048");

export default async function Game2048Page({ searchParams }: PageProps<"/[lang]/2048">) {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      {/* Hasta lg, una sola columna del ancho del tablero, centrada como en el 3 en raya. */}
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">2048</h1>
          <HowToPlayButton game="2048" name="2048" />
        </div>
        <p className="mb-8 text-muted">
          {m.gamePages.game2048}
          <Link href="/reto-diario" className="font-medium text-ink underline underline-offset-4">
            {m.gamePages.playDaily}
          </Link>
          .
        </p>
      </div>
      <Suspense fallback={<div className="board mx-auto max-w-[30rem] animate-pulse lg:mx-0" />}>
        <GameForViewer searchParams={searchParams} />
      </Suspense>
      <GameGuideSection id="2048" />
    </main>
  );
}

async function GameForViewer({ searchParams }: { searchParams: PageProps<"/[lang]/2048">["searchParams"] }) {
  const viewer = await getViewer();
  const { reto } = await searchParams;
  const challenge = viewer && typeof reto === "string" ? await loadChallenge(reto, viewer.id) : null;
  return <Game2048Screen viewerId={viewer?.id ?? null} challenge={challenge} />;
}

/** Reto recibido por el usuario y aún no rechazado; si no, se juega normal. */
async function loadChallenge(id: string, viewerId: string): Promise<ActiveChallenge | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenges")
    .select(`id, target_score, challenger:profiles!challenges_challenger_id_fkey(${PLAYER_COLUMNS})`)
    .eq("id", id)
    .eq("challenged_id", viewerId)
    .is("declined_at", null)
    .maybeSingle();
  return data ? { id: data.id, targetScore: data.target_score, challenger: data.challenger } : null;
}
