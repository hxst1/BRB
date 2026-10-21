import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tron",
  description: "Tron en directo contra tus amigos, a 3 rondas.",
};

export default function TronPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Tron</h1>
      <p className="mb-8 text-muted">En directo, a 3 rondas: encierra a tu rival antes de chocar. Reta a un amigo y entrad los dos a la partida.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/tron");
  return <MatchList viewerId={viewer.id} games={["tron"]} />;
}
