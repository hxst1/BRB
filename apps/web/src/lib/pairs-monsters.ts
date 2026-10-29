import { monsterFromSeed, type MonsterParts } from "@repo/avatars";
import { seedFromString } from "@repo/games";
import { PAIRS } from "@repo/games/pairs";

/**
 * Los 10 monstruos de una partida de Parejas, sacados de su semilla. Saber
 * cuáles son no dice dónde está cada uno (eso lo guarda el servidor). Para que
 * se distingan, no se repite ninguna combinación de cuerpo y color, y cada
 * color sale como mucho dos veces.
 */
export function pairMonsters(seed: number): MonsterParts[] {
  const monsters: MonsterParts[] = [];
  const looks = new Set<string>();
  const colors = new Map<string, number>();
  for (let i = 0; monsters.length < PAIRS; i++) {
    const parts = monsterFromSeed(seedFromString(`pairs:${seed}:${i}`));
    const look = `${parts.body}:${parts.palette}`;
    const uses = colors.get(parts.palette) ?? 0;
    // Tras muchos intentos (no debería pasar), se acepta cualquiera distinto.
    if (looks.has(look) || (uses >= 2 && i < 500)) continue;
    looks.add(look);
    colors.set(parts.palette, uses + 1);
    monsters.push(parts);
  }
  return monsters;
}
