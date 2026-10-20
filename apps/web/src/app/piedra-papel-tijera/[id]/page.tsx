import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RpsMatchView } from "@/components/rps/match-view";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Piedra, papel o tijera" };

export default function RpsMatchPage({ params }: PageProps<"/piedra-papel-tijera/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-3xl bg-line/40" />}>
        <MatchForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function MatchForViewer({ params }: { params: PageProps<"/piedra-papel-tijera/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/piedra-papel-tijera/${id}`)}`);
  return <RpsMatchView matchId={id} viewerId={viewer.id} />;
}
