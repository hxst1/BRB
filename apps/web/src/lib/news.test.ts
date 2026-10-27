import { describe, expect, it } from "vitest";
import { newsItems, type NewsPost } from "./news";
import { guidesFor } from "./seo";

const post = (slug: string, publishedAt: string, extra: Partial<NewsPost> = {}): NewsPost => ({
  slug,
  kind: "news",
  title_es: `Título ${slug}`,
  body_es: "Texto",
  title_en: null,
  body_en: null,
  cta_url: null,
  cta_label_es: null,
  cta_label_en: null,
  pinned: false,
  published_at: publishedAt,
  ...extra,
});

describe("novedades", () => {
  it("los juegos del mismo día van juntos y los que aún no han salido no están", () => {
    const items = newsItems([], "es", new Date("2026-10-27T12:00:00+01:00").getTime());
    const games = items.flatMap((item) => (item.type === "games" ? item.games.map((game) => game.id) : []));
    expect(games.sort()).toEqual(guidesFor("es").filter((game) => new Date(game.addedAt) <= new Date("2026-10-27T12:00:00+01:00")).map((g) => g.id).sort());
    const launch = items.find((item) => item.type === "games" && item.games.some((game) => game.id === "reversi"));
    expect(launch?.type === "games" && launch.games.map((game) => game.id).sort()).toEqual(["dots", "reversi", "typing"]);
  });

  it("lo fijado va primero y el resto de lo más nuevo a lo más viejo", () => {
    const items = newsItems(
      [post("viejo", "2026-10-21T10:00:00Z", { pinned: true }), post("nuevo", "2026-10-26T10:00:00Z"), post("medio", "2026-10-24T10:00:00Z")],
      "es",
      new Date("2026-10-27T12:00:00Z").getTime(),
    );
    const posts = items.filter((item) => item.type === "post").map((item) => item.key);
    expect(posts).toEqual(["viejo", "nuevo", "medio"]);
    expect(items[0]?.key).toBe("viejo");
    for (let i = 2; i < items.length; i++) expect(items[i - 1]!.date.getTime()).toBeGreaterThanOrEqual(items[i]!.date.getTime());
  });

  it.each(["en", "ja"] as const)("en %s, el texto en inglés si lo hay; si no, el español", (locale) => {
    const [translated, plain] = newsItems(
      [post("en", "2026-10-26T10:00:00Z", { title_en: "Title", body_en: "Body", cta_url: "/2048", cta_label_es: "Jugar", pinned: true }), post("es", "2026-10-26T09:00:00Z", { pinned: true })],
      locale,
    );
    expect(translated?.type === "post" && [translated.title, translated.cta?.label]).toEqual(["Title", "Jugar"]);
    expect(plain?.type === "post" && plain.title).toBe("Título es");
  });

  it("los juegos nuevos salen con su nombre en el idioma de la app", () => {
    const items = newsItems([], "ja", new Date("2026-10-27T12:00:00+01:00").getTime());
    const names = items.flatMap((item) => (item.type === "games" ? item.games.map((game) => game.name) : []));
    expect(names).toContain("リバーシ");
  });
});
