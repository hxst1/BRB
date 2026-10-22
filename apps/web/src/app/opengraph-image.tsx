import { brand } from "@repo/brand";
import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = `${brand.name}: minijuegos online gratis`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Minijuegos para desconectar", subtitle: "2048, Sudoku, Wordle, Buscaminas y partidas contra tus amigos. Gratis." });
}
