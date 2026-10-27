import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { RankingSkeleton } from "@/components/ranking/ranking-skeleton";
import { isGroupId } from "@/lib/groups";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    title: m.meta.rankingTitle,
    description: m.meta.rankingDescription,
    alternates: alternatesFor("/ranking", locale),
  };
}

export default async function RankingPage({ searchParams }: PageProps<"/[lang]/ranking">) {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-6 text-5xl font-bold sm:text-6xl">{m.ranking.title}</h1>
      {/* Sin fundido: el tablero llega con sus propios esqueletos, iguales que este. */}
      <Suspense fallback={<RankingSkeleton />}>
        <BoardForViewer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Con ?grupo=<id> (desde la página del grupo) se abre el ranking de ese grupo. */
async function BoardForViewer({ searchParams }: { searchParams: PageProps<"/[lang]/ranking">["searchParams"] }) {
  const [viewer, { grupo }] = await Promise.all([getViewer(), searchParams]);
  const { data: groups } = viewer ? await (await createClient()).from("groups").select("id, name").order("created_at") : { data: null };
  const initialGroup = isGroupId(grupo) && groups?.some((group) => group.id === grupo) ? grupo : null;
  return <RankingBoard key={initialGroup} viewerId={viewer?.id ?? null} groups={groups ?? []} initialGroup={initialGroup} />;
}
