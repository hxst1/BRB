import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TronMatchView } from "@/components/tron/match-view";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Tron", robots: PRIVATE_PAGE };

export default function TronMatchPage({ params }: PageProps<"/[lang]/tron/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-2 pb-16 sm:px-6">
      <Suspense fallback={<div className="aspect-square w-full max-w-sm animate-pulse rounded-3xl bg-line/40" />}>
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
