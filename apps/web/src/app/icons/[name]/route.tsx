import { appIcon } from "@/lib/app-icon";

/** Iconos del manifiesto de la PWA (ver app/manifest.ts). */
const ICONS: Record<string, { size: number; maskable?: boolean }> = {
  "icon-192.png": { size: 192 },
  "icon-512.png": { size: 512 },
  "maskable-512.png": { size: 512, maskable: true },
  "badge-96.png": { size: 96 },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("No encontrado", { status: 404 });
  return appIcon(icon.size, { maskable: icon.maskable });
}
