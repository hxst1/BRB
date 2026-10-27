import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LiveMatchSkeleton } from "@/components/tictactoe/match-skeleton";
import { TronMatchView } from "@/components/tron/match-view";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.matchGames.tron, robots: PRIVATE_PAGE };
}

export default function TronMatchPage({ params }: PageProps<"/[lang]/tron/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-2 pb-16 sm:px-6">
      <Suspense fallback={<LiveMatchSkeleton game="tron" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/[lang]/tron/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/tron/${id}`)}`);
  return <TronMatchView matchId={id} viewerId={viewer.id} />;
}
