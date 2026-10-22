import { appIcon } from "@/lib/app-icon";
import { monsterFromCode } from "@/lib/monster-code";

/**
 * Iconos con el monstruo de cada uno: /icons/me/icon-192.png?m=<código>.
 * El código (lib/monster-code.ts) describe el monstruo entero, así que cada
 * URL da siempre la misma imagen y se cachea para siempre. Sin código válido,
 * la mascota.
 */
const ICONS: Record<string, { size: number; maskable?: boolean }> = {
  "icon-64.png": { size: 64 },
  "icon-192.png": { size: 192 },
  "icon-512.png": { size: 512 },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-180.png": { size: 180 },
};

export async function GET(request: Request, { params }: RouteContext<"/icons/me/[name]">) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("No encontrado", { status: 404 });
  const monster = monsterFromCode(new URL(request.url).searchParams.get("m")) ?? undefined;
  const image = appIcon(icon.size, { maskable: icon.maskable, monster });
  image.headers.set("cache-control", "public, max-age=31536000, immutable");
  return image;
}
