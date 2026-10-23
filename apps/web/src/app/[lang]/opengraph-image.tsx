import { brand } from "@repo/brand";
import { messagesFor } from "@/lib/i18n";
import { ogImage, OG_SIZE, ogLocale } from "@/lib/og";

export const alt = `${brand.name}: minijuegos online gratis`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const m = messagesFor(await ogLocale(params));
  return ogImage({ title: m.meta.ogTitle, subtitle: m.meta.ogSubtitle });
}
