import type { MetadataRoute } from "next";
import { absoluteUrl, GAME_GUIDES } from "@/lib/seo";

/** Páginas públicas: la portada, cada juego y las páginas de ranking, reto diario y apoyo. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
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
}
