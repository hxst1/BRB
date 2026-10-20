import type { CSSProperties } from "react";
import { renderMonsterSvg, resolveMonster, type Mood } from "@repo/avatars";
import type { Json } from "@repo/db";

/**
 * Monstruo del perfil. El SVG sale solo del catálogo de partes (los ids de
 * `parts` se validan en resolveMonster), por eso puede insertarse como HTML.
 */
export function Avatar({
  seed,
  parts,
  size = 32,
  mood = "neutral",
  label,
}: {
  seed: number;
  parts?: Json;
  size?: number;
  mood?: Mood;
  /** Si se omite, el avatar es decorativo (el nombre suele ir al lado). */
  label?: string;
}) {
  const svg = renderMonsterSvg(resolveMonster(seed, parts), mood);
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="monster inline-block shrink-0"
      style={{ width: size, height: size, "--blink-delay": `${-(seed % 6000)}ms` } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
