import type { MetadataRoute } from "next";
import { brand } from "@repo/brand";

export default function manifest(): MetadataRoute.Manifest {
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
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Jugar al 2048", url: "/2048", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Chat", url: "/chat", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Ranking", url: "/ranking", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
