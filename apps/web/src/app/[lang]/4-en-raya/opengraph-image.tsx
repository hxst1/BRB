import { gameOgImage, OG_SIZE } from "@/lib/og";
import { gameGuide } from "@/lib/seo";

export const alt = gameGuide("connect4").title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return gameOgImage("connect4");
}
