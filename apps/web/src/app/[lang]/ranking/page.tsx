import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getViewer } from "@/lib/session";
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

export default async function RankingPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-6 text-5xl font-bold sm:text-6xl">{m.ranking.title}</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-line/40" />}>
        <BoardForViewer />
      </Suspense>
    </main>
  );
}

async function BoardForViewer() {
  const viewer = await getViewer();
  return <RankingBoard viewerId={viewer?.id ?? null} />;
}
