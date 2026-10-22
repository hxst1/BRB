import type { MetadataRoute } from "next";
import { brand } from "@repo/brand";

/**
 * Manifiesto de la PWA. `icon` da la URL de cada icono: los de siempre en
 * /manifest.webmanifest, o los del monstruo de cada uno en /me.webmanifest.
 */
export function buildManifest(icon: (file: string) => string = (file) => `/icons/${file}`): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${brand.name} · ${brand.expansion}`,
    short_name: brand.name,
    description: brand.description,
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: brand.themeColor,
    theme_color: brand.themeColor,
    categories: ["games", "entertainment", "social"],
    icons: [
      { src: icon("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon("maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Jugar al 2048", url: "/2048", icons: [{ src: icon("icon-192.png"), sizes: "192x192" }] },
      { name: "Chat", url: "/chat", icons: [{ src: icon("icon-192.png"), sizes: "192x192" }] },
      { name: "Ranking", url: "/ranking", icons: [{ src: icon("icon-192.png"), sizes: "192x192" }] },
    ],
  };
}
