import type { MetadataRoute } from "next";
import { buildManifest } from "@/lib/manifest";

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
