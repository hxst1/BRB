import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchView } from "@/components/tictactoe/match-view";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "3 en raya", robots: PRIVATE_PAGE };

export default function MatchPage({ params }: PageProps<"/[lang]/3-en-raya/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="ttt-board max-w-md animate-pulse" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/[lang]/3-en-raya/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/3-en-raya/${id}`)}`);
  return <MatchView matchId={id} viewerId={viewer.id} />;
}
