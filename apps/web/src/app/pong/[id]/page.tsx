import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PongMatchView } from "@/components/pong/match-view";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Pong" };

export default function PongMatchPage({ params }: PageProps<"/pong/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-2 pb-16 sm:px-6">
      <Suspense fallback={<div className="aspect-[1/1.6] w-full max-w-sm animate-pulse rounded-3xl bg-line/40" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/pong/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/pong/${id}`)}`);
  return <PongMatchView matchId={id} viewerId={viewer.id} />;
}
