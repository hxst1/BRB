import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "4 en raya",
  description: "Reta a tus amigos al 4 en raya. Cada uno juega cuando puede.",
};

export default function ConnectFourPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">4 en raya</h1>
      <p className="mb-8 text-muted">Deja caer tus fichas y junta cuatro en línea. Cada uno juega cuando puede.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/4-en-raya");
  return <MatchList viewerId={viewer.id} games={["connect4"]} />;
}
