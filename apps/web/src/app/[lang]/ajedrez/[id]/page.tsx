import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChessMatchView } from "@/components/chess/match-view";
import { getMessages } from "@/lib/i18n/server";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.matchGames.chess, robots: PRIVATE_PAGE };
}

export default function ChessMatchPage({ params }: PageProps<"/[lang]/ajedrez/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="aspect-square w-full max-w-lg animate-pulse rounded-[18px] bg-line/40" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/[lang]/ajedrez/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/ajedrez/${id}`)}`);
  return <ChessMatchView matchId={id} viewerId={viewer.id} />;
}
