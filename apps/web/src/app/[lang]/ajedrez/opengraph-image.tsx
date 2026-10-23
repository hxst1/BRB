import { gameOgImage, OG_SIZE, ogLocale } from "@/lib/og";
import { gameGuide } from "@/lib/seo";

export const alt = gameGuide("chess").title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  return gameOgImage("chess", await ogLocale(params));
}
