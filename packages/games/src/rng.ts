/**
 * PRNG determinista (mulberry32) con estado inmutable.
 *
 * Toda la aleatoriedad de los juegos pasa por aquí para que una partida se
 * pueda reproducir exactamente a partir de su semilla y su lista de
 * movimientos: así el servidor valida puntuaciones y los retos son justos.
 */
export type RngState = number;

export function createRng(seed: number): RngState {
  return seed >>> 0;
}

/** Devuelve un float en [0, 1) y el siguiente estado. */
export function nextFloat(state: RngState): [value: number, next: RngState] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Entero en [0, max). */
export function nextInt(state: RngState, max: number): [value: number, next: RngState] {
  const [value, next] = nextFloat(state);
  return [Math.floor(value * max), next];
}

/** Semilla estable a partir de un texto, p. ej. la fecha del reto diario. */
export function seedFromString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]!;
}
