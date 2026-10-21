import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "Hundir la flota",
  description: "Reta a tus amigos a hundir la flota. Agua, tocado y hundido, cada uno a su ritmo.",
};

export default function BattleshipPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Hundir la flota</h1>
      <p className="mb-8 text-muted">Coloca tus barcos y hunde los de tu amigo antes que él los tuyos. Cada uno dispara cuando puede.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/hundir-la-flota");
  return <MatchList viewerId={viewer.id} games={["battleship"]} />;
}
