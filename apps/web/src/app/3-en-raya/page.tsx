import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "3 en raya",
  description: "Reta a tus amigos al 3 en raya. Cada uno juega cuando puede.",
};

export default function TicTacToePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">3 en raya</h1>
      <p className="mb-8 text-muted">Reta a tus amigos. Cada uno juega cuando puede.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/3-en-raya");
  return <MatchList viewerId={viewer.id} games={["tictactoe"]} />;
}
