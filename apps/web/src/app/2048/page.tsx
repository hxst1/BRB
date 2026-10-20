import type { Metadata } from "next";
import { Suspense } from "react";
import { Game2048Screen, type ActiveChallenge } from "@/components/game2048/screen";
import { PLAYER_COLUMNS } from "@/lib/queries";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "2048",
  description: "Junta fichas iguales hasta llegar a 2048.",
};

export default function Game2048Page({ searchParams }: PageProps<"/2048">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">2048</h1>
      <p className="mb-8 text-muted">Junta fichas iguales hasta llegar a 2048.</p>
      <Suspense fallback={<div className="board max-w-[30rem] animate-pulse" />}>
        <GameForViewer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function GameForViewer({ searchParams }: { searchParams: PageProps<"/2048">["searchParams"] }) {
  const viewer = await getViewer();
  const { reto } = await searchParams;
  const challenge = viewer && typeof reto === "string" ? await loadChallenge(reto, viewer.id) : null;
  return <Game2048Screen viewerId={viewer?.id ?? null} challenge={challenge} />;
}

/** Reto recibido por el usuario y aún no rechazado; si no, se juega normal. */
async function loadChallenge(id: string, viewerId: string): Promise<ActiveChallenge | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenges")
    .select(`id, target_score, challenger:profiles!challenges_challenger_id_fkey(${PLAYER_COLUMNS})`)
    .eq("id", id)
    .eq("challenged_id", viewerId)
    .is("declined_at", null)
    .maybeSingle();
  return data ? { id: data.id, targetScore: data.target_score, challenger: data.challenger } : null;
}
