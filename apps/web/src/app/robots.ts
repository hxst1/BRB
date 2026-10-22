import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Todo abierto salvo la API, también para los rastreadores de asistentes de IA
 * (GPTBot, ClaudeBot, PerplexityBot…): así pueden recomendar los juegos. Las
 * páginas privadas no se bloquean aquí sino con `noindex` (si se bloquearan,
 * el buscador no llegaría a leer el `noindex`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dev/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
