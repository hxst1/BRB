import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchList } from "@/components/tictactoe/match-list";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "Piedra, papel o tijera",
  description: "Reta a tus amigos a piedra, papel o tijera, o a la versión con lagarto y Spock.",
};

export default function RpsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-5xl font-bold text-balance sm:text-7xl">Piedra, papel o tijera</h1>
      <p className="mb-8 text-muted">Al mejor de 3. Cada uno elige en secreto. Con lagarto y Spock si os atrevéis.</p>
      <Suspense fallback={<div className="h-40 max-w-xl animate-pulse rounded-3xl bg-line/40" />}>
        <ListForViewer />
      </Suspense>
    </main>
  );
}

async function ListForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/piedra-papel-tijera");
  return <MatchList viewerId={viewer.id} games={["rps", "rpsls"]} />;
}
