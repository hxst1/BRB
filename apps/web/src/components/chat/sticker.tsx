import { renderStickerSvg, resolveMonster, type Sticker } from "@repo/avatars";
import type { Json } from "@repo/db";

/**
 * Un sticker: el monstruo de quien lo envía con la expresión. El SVG solo
 * sale del catálogo (nunca de texto del usuario), así que se puede insertar.
 */
export function StickerImage({ sticker, seed, parts, label, size = 112 }: { sticker: Sticker; seed: number; parts: Json; label: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="block shrink-0"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: renderStickerSvg(resolveMonster(seed, parts), sticker) }}
    />
  );
}
