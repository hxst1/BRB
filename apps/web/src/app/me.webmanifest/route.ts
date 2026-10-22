import { buildManifest } from "@/lib/manifest";
import { ICON_VERSION, monsterFromCode } from "@/lib/monster-code";

/** Manifiesto con los iconos del monstruo de cada uno: /me.webmanifest?m=<código>. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("m");
  if (!monsterFromCode(code)) return Response.redirect(new URL("/manifest.webmanifest", request.url), 307);
  const manifest = buildManifest((file) => `/icons/me/${file}?m=${encodeURIComponent(code!)}&v=${ICON_VERSION}`);
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=86400" },
  });
}
