import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchSkeleton } from "@/components/tictactoe/match-skeleton";
import { RpsMatchView } from "@/components/rps/match-view";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.matchGames.rps, robots: PRIVATE_PAGE };
}

export default function RpsMatchPage({ params }: PageProps<"/[lang]/piedra-papel-tijera/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<MatchSkeleton game="rps" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/[lang]/piedra-papel-tijera/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/piedra-papel-tijera/${id}`)}`);
  return <RpsMatchView matchId={id} viewerId={viewer.id} />;
}
