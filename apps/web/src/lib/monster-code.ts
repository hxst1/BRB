import { resolveMonster, sanitizeParts, type MonsterParts } from "@repo/avatars";
import type { Json } from "@repo/db";

/**
 * Código corto de un monstruo para ponerlo en una URL (iconos personales):
 * "round.coral.two.tongue.horns.1". Cada combinación da siempre la misma URL,
 * así que el icono se puede cachear para siempre.
 */
export function monsterCode(seed: number, parts: Json): string {
  const m = resolveMonster(seed, parts);
  return [m.body, m.palette, m.eyes, m.mouth, m.top, m.cheeks ? 1 : 0].join(".");
}

/**
 * Versión del dibujo de los iconos personales. Las URL se cachean para siempre:
 * si cambia cómo se dibujan, súbela para que se pidan de nuevo.
 */
export const ICON_VERSION = 2;

/** null si el código no es válido (entonces se usa la mascota). */
export function monsterFromCode(code: string | null): MonsterParts | null {
  const [body, palette, eyes, mouth, top, cheeks] = (code ?? "").split(".");
  const parts = sanitizeParts({ body, palette, eyes, mouth, top, cheeks: cheeks === "1" });
  return Object.keys(parts).length === 6 ? (parts as MonsterParts) : null;
}
