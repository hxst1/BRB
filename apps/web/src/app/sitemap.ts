import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/locales";
import { absoluteUrl, GAME_GUIDES, languageAlternates, localizedPath } from "@/lib/seo";

/** Páginas públicas: la portada, cada juego y las páginas de ranking, reto diario y apoyo, en cada idioma. */
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
    { url: absoluteUrl("/juegos"), lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/novedades"), lastModified, changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/apoyar"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/creditos"), lastModified, changeFrequency: "yearly", priority: 0.1 },
    ...["terminos", "privacidad", "cookies"].map((slug) => ({
      url: absoluteUrl(`/legal/${slug}`),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.1,
    })),
  ];
  // Cada página en cada idioma (la española sin prefijo, las demás en /en y /ja), enlazadas entre sí (hreflang).
  return pages.flatMap((page) => {
    const path = new URL(page.url).pathname;
    const alternates = { languages: languageAlternates(path, absoluteUrl) };
    return LOCALES.map((locale) => ({ ...page, url: absoluteUrl(localizedPath(path, locale)), alternates }));
  });
}
