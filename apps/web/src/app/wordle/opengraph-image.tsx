import { gameOgImage, OG_SIZE } from "@/lib/og";
import { gameGuide } from "@/lib/seo";

export const alt = gameGuide("wordle").title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return gameOgImage("wordle");
}
