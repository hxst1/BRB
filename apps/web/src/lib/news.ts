import type { Tables } from "@repo/db";
import { contentLanguage, type Locale } from "./i18n/locales";
import { guidesFor, type GameGuide } from "./seo";

/**
 * Lo que sale en /novedades: los anuncios del panel (news_posts) y los juegos
 * nuevos, que se sacan de la lista de juegos (addedAt): los del mismo día van
 * juntos. Lo fijado primero; el resto, de lo más nuevo a lo más viejo.
 */
export type NewsPost = Pick<
  Tables<"news_posts">,
  "slug" | "kind" | "title_es" | "body_es" | "title_en" | "body_en" | "cta_url" | "cta_label_es" | "cta_label_en" | "pinned" | "published_at"
>;

export type NewsItem =
  | { type: "post"; key: string; date: Date; pinned: boolean; kind: string; title: string; body: string; cta: { url: string; label: string } | null }
  | { type: "games"; key: string; date: Date; pinned: false; games: GameGuide[] };

/** Id del anuncio en seen_announcements (los avisos de juego nuevo usan el id del juego tal cual). */
export const seenId = (slug: string) => `post-${slug}`;

export const NEWS_POST_COLUMNS = "slug, kind, title_es, body_es, title_en, body_en, cta_url, cta_label_es, cta_label_en, pinned, published_at";

/** Día (en España) de una fecha: los juegos salidos el mismo día van en una sola novedad. */
const dayOf = (date: Date) => date.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Lo más reciente de las novedades (anuncio o juego ya publicado), para el punto del megáfono. */
export function latestNewsAt(latestPost: string | null | undefined, now = Date.now()): string | null {
  const games = guidesFor("es")
    .map((game) => new Date(game.addedAt).getTime())
    .filter((time) => time <= now);
  const latest = Math.max(latestPost ? Date.parse(latestPost) : 0, ...games);
  return latest > 0 ? new Date(latest).toISOString() : null;
}

export function newsItems(posts: NewsPost[], locale: Locale, now = Date.now()): NewsItem[] {
  // Los anuncios solo se escriben en español e inglés: en japonés, el inglés si lo hay.
  const english = contentLanguage(locale) === "en";
  const items: NewsItem[] = posts.map((post) => {
    const en = english && post.title_en && post.body_en;
    const label = (english && post.cta_label_en) || post.cta_label_es;
    return {
      type: "post",
      key: post.slug,
      date: new Date(post.published_at),
      pinned: post.pinned,
      kind: post.kind,
      title: en ? post.title_en! : post.title_es,
      body: en ? post.body_en! : post.body_es,
      cta: post.cta_url && label ? { url: post.cta_url, label } : null,
    };
  });

  const days = new Map<string, GameGuide[]>();
  for (const game of guidesFor(locale)) {
    const added = new Date(game.addedAt);
    if (added.getTime() > now) continue;
    const day = dayOf(added);
    days.set(day, [...(days.get(day) ?? []), game]);
  }
  for (const [day, games] of days) {
    const date = new Date(Math.max(...games.map((game) => new Date(game.addedAt).getTime())));
    items.push({ type: "games", key: `juegos-${day}`, date, pinned: false, games });
  }

  return items.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.getTime() - a.date.getTime());
}
