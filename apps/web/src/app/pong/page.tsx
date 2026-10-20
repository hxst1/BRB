import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pong",
  description: "Pong en directo contra tus amigos, a 5 puntos.",
};

export default function PongPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Pong</h1>
      <p className="mb-8 text-muted">En directo, a 5 puntos. Reta a un amigo y entrad los dos a la partida.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/pong");
  return <MatchList viewerId={viewer.id} games={["pong"]} />;
}
