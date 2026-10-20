import type { MetadataRoute } from "next";
import { brand } from "@repo/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} · ${brand.expansion}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: brand.themeColor,
    theme_color: brand.themeColor,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
