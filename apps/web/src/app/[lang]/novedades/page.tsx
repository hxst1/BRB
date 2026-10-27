import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GameTile } from "@/components/news/game-tile";
import { MarkNewsSeen } from "@/components/news/news-banner";
import type { Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { renderMarkdown } from "@/lib/markdown";
import { NEWS_POST_COLUMNS, newsItems, type NewsItem } from "@/lib/news";
import { alternatesFor } from "@/lib/seo";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return { title: m.newsPage.title, description: m.newsPage.description, alternates: alternatesFor("/novedades", locale) };
}

/** Novedades: anuncios del panel de admin y juegos nuevos, de lo más nuevo a lo más viejo. */
export default async function NewsPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24 sm:px-6">
      <h1 className="display text-6xl font-bold sm:text-7xl">{m.newsPage.title}</h1>
      <p className="mb-8 text-muted">{m.newsPage.intro}</p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-line/40" />}>
        <NewsList />
      </Suspense>
    </main>
  );
}

async function NewsList() {
  // Los anuncios programados y los juegos salen a su hora: la lista se hace en cada visita.
  await connection();
  const [m, locale, supabase, viewerId] = await Promise.all([getMessages(), getLocale(), createClient(), getViewerId()]);
  const { data, error } = await supabase.from("news_posts").select(NEWS_POST_COLUMNS).order("published_at", { ascending: false }).limit(50);
  if (error) console.error("novedades: error leyendo los anuncios", error);
  const items = newsItems(data ?? [], locale);
  const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

  return (
    <>
      {/* Lo que hay en la página ya está visto: el aviso de la portada no vuelve a salir. */}
      {viewerId && <MarkNewsSeen slugs={items.flatMap((item) => (item.type === "post" ? [item.key] : []))} />}
      <ol className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.key} id={item.key} className="scroll-mt-24">
            <article className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-soft">
              <p className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded-full px-2.5 py-0.5 font-semibold text-ink" style={{ background: "var(--cell)" }}>
                  {item.type === "games" ? (item.games.length === 1 ? m.newsPage.kinds.game : m.newsPage.kinds.games) : kindLabel(m, item.kind)}
                </span>
                <time dateTime={item.date.toISOString()}>{format.format(item.date)}</time>
              </p>
              {item.type === "post" ? <Post item={item} /> : <Games item={item} m={m} />}
            </article>
          </li>
        ))}
      </ol>
    </>
  );
}

function kindLabel(m: Messages, kind: string): string {
  return m.newsPage.kinds[kind as keyof typeof m.newsPage.kinds] ?? m.newsPage.kinds.news;
}

function Post({ item }: { item: Extract<NewsItem, { type: "post" }> }) {
  const external = item.cta?.url.startsWith("https://");
  return (
    <>
      <h2 className="display text-3xl font-bold text-balance">{item.title}</h2>
      {/* Texto del panel de admin, pasado por un Markdown que escapa todo el HTML (lib/markdown.ts). */}
      <div className="legal-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.body) }} />
      {item.cta &&
        (external ? (
          <a href={item.cta.url} target="_blank" rel="noopener noreferrer" className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {item.cta.label}
          </a>
        ) : (
          <Link href={item.cta.url} className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {item.cta.label}
          </Link>
        ))}
    </>
  );
}

function Games({ item, m }: { item: Extract<NewsItem, { type: "games" }>; m: Messages }) {
  const [first] = item.games;
  return (
    <>
      <h2 className="display text-3xl font-bold text-balance">
        {item.games.length === 1 ? m.newsPage.newGame(first!.name) : m.newsPage.newGames(item.games.length)}
      </h2>
      <ul className="flex flex-col gap-2">
        {item.games.map((game) => (
          <li key={game.id}>
            <Link href={game.path} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-bg">
              <GameTile accent={game.accent} className="bg-bg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{game.name}</span>
                <span className="text-sm text-muted">{game.tagline}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{game.mode === "solo" ? m.news.solo : m.news.withFriends}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
