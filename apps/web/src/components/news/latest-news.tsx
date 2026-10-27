import { getLocale, getMessages } from "@/lib/i18n/server";
import { NEWS_POST_COLUMNS, newsItems, seenId } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";
import { NewsBanner } from "./news-banner";

/** Los anuncios más viejos que esto ya no salen en la portada (siguen en /novedades). */
const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

const recentSince = () => new Date(Date.now() - RECENT_MS).toISOString();

/** En la portada: el último anuncio (de los últimos 14 días) que el usuario aún no ha visto. */
export async function LatestNews({ viewerId }: { viewerId: string }) {
  const [supabase, m, locale] = await Promise.all([createClient(), getMessages(), getLocale()]);
  const { data: posts } = await supabase
    .from("news_posts")
    .select(NEWS_POST_COLUMNS)
    .gte("published_at", recentSince())
    .order("published_at", { ascending: false })
    .limit(5);
  if (!posts?.length) return null;

  const { data: seen } = await supabase
    .from("seen_announcements")
    .select("announcement")
    .eq("user_id", viewerId)
    .in("announcement", posts.map((post) => seenId(post.slug)));
  const seenIds = new Set((seen ?? []).map((row) => row.announcement));
  const latest = newsItems(posts.filter((post) => !seenIds.has(seenId(post.slug))), locale).find((item) => item.type === "post");
  if (!latest || latest.type !== "post") return null;

  const kind = m.newsPage.kinds[latest.kind as keyof typeof m.newsPage.kinds] ?? m.newsPage.kinds.news;
  return <NewsBanner slug={latest.key} kind={kind} title={latest.title} />;
}
