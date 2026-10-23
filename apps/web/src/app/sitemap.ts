import type { MetadataRoute } from "next";
import { absoluteUrl, GAME_GUIDES, localizedPath } from "@/lib/seo";

/** La página en los dos idiomas (la española sin prefijo y la inglesa en /en). */
function bothLanguages(path: string) {
  return { languages: { es: absoluteUrl(path), en: absoluteUrl(localizedPath(path, "en")) } };
}

/** Páginas públicas: la portada, cada juego y las páginas de ranking, reto diario y apoyo, en los dos idiomas. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    ...GAME_GUIDES.map((game) => ({
      url: absoluteUrl(game.path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: game.mode === "solo" ? 0.9 : 0.8,
    })),
    { url: absoluteUrl("/reto-diario"), lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/ranking"), lastModified, changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/apoyar"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...["terminos", "privacidad", "cookies"].map((slug) => ({
      url: absoluteUrl(`/legal/${slug}`),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.1,
    })),
  ];
  // Cada página, también en inglés, y las dos se enlazan entre sí (hreflang).
  return pages.flatMap((page) => {
    const path = new URL(page.url).pathname;
    const alternates = bothLanguages(path);
    return [
      { ...page, alternates },
      { ...page, url: absoluteUrl(localizedPath(path, "en")), alternates },
    ];
  });
}
