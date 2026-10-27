import type { Metadata } from "next";
import Link from "next/link";
import { GamesCatalog } from "@/components/games/catalog";
import { GameCardsSkeleton } from "@/components/home/game-cards-skeleton";
import { Loading } from "@/components/skeleton";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";
import { getViewer } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return { title: m.gamesPage.title, description: m.gamesPage.intro, alternates: alternatesFor("/juegos", locale) };
}

/** Todos los juegos: fijados, en solitario y contra amigos, con tus datos si tienes sesión. */
export default async function GamesPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="display text-6xl font-bold sm:text-7xl">{m.gamesPage.title}</h1>
        <Link href="/ranking" className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-muted">
          {m.gamesPage.ranking}
        </Link>
      </div>
      <p className="mb-8 max-w-2xl text-muted">{m.gamesPage.intro}</p>
      <Loading skeleton={<GameCardsSkeleton stats />}>
        <Catalog />
      </Loading>
    </main>
  );
}

async function Catalog() {
  return <GamesCatalog viewer={await getViewer()} />;
}
