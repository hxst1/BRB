import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BattleshipMatchView } from "@/components/battleship/match-view";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Hundir la flota", robots: PRIVATE_PAGE };

export default function MatchPage({ params }: PageProps<"/hundir-la-flota/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="sea-board aspect-square w-full max-w-md animate-pulse" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/hundir-la-flota/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/hundir-la-flota/${id}`)}`);
  return <BattleshipMatchView matchId={id} viewerId={viewer.id} />;
}
