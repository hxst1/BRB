import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PongMatchView } from "@/components/pong/match-view";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.matchGames.pong, robots: PRIVATE_PAGE };
}

export default function PongMatchPage({ params }: PageProps<"/[lang]/pong/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-2 pb-16 sm:px-6">
      <Suspense fallback={<div className="aspect-[1/1.6] w-full max-w-sm animate-pulse rounded-3xl bg-line/40" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/[lang]/pong/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/pong/${id}`)}`);
  return <PongMatchView matchId={id} viewerId={viewer.id} />;
}
