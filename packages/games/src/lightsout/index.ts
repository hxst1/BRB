import { createRng, nextInt, type RngState } from "../rng";

/**
 * Lights Out por niveles. Pulsar una casilla cambia ella y sus vecinas
 * (arriba, abajo, izquierda, derecha); el nivel se supera al apagarlo todo.
 * El tablero crece de 3 × 3 a 7 × 7 y luego cada nivel enciende más luces.
 * Cada nivel tiene un límite de pulsaciones: si se acaban, la partida termina.
 *
 * Los tableros salen de la semilla pulsando casillas al azar sobre un tablero
 * apagado, así que siempre se pueden resolver dentro del límite.
 */

export const MAX_SIZE = 7;

export interface LightsOutState {
  seed: number;
  rng: RngState;
  /** Nivel en juego (empieza en 1). */
  level: number;
  size: number;
  /** Luces encendidas, en orden de filas. */
  lights: boolean[];
  pressesLeft: number;
  /** Niveles superados: la puntuación. */
  completed: number;
  /** Pulsaciones de toda la partida, codificadas (ver encodeCell). */
  presses: string;
  over: boolean;
}

export function sizeForLevel(level: number): number {
  return Math.min(3 + Math.floor((level - 1) / 2), MAX_SIZE);
}

/**
 * Pulsaciones con que se genera el nivel. Los dos primeros se resuelven con 1
 * y 2 toques, para aprender; desde el tercero crece uno por nivel.
 */
export function scrambleForLevel(level: number): number {
  return level <= 2 ? level : level + 2;
}

/** Límite de pulsaciones: las de la mezcla (siempre resuelven) más un margen para errores. */
export function budgetForLevel(level: number): number {
  return scrambleForLevel(level) + sizeForLevel(level);
}

/** Cambia la casilla y sus vecinas. */
export function toggle(lights: boolean[], size: number, cell: number): boolean[] {
  const next = lights.slice();
  const row = Math.floor(cell / size);
  const col = cell % size;
  for (const [r, c] of [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ] as const) {
    if (r >= 0 && r < size && c >= 0 && c < size) next[r * size + c] = !next[r * size + c];
  }
  return next;
}

function generateLevel(rng: RngState, level: number): { lights: boolean[]; rng: RngState } {
  const size = sizeForLevel(level);
  const cells = size * size;
  const presses = Math.min(scrambleForLevel(level), cells - 1);
  for (;;) {
    // Casillas distintas al azar (Fisher-Yates parcial): pulsar dos veces la misma se anula.
    const pool = Array.from({ length: cells }, (_, i) => i);
    let lights = Array<boolean>(cells).fill(false);
    for (let i = 0; i < presses; i++) {
      const [offset, next] = nextInt(rng, cells - i);
      rng = next;
      const j = i + offset;
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      lights = toggle(lights, size, pool[i]!);
    }
    // Hay combinaciones de pulsaciones que lo dejan todo apagado: se vuelve a mezclar.
    if (lights.some(Boolean)) return { lights, rng };
  }
}

function startLevel(state: Omit<LightsOutState, "size" | "lights" | "pressesLeft">): LightsOutState {
  const { lights, rng } = generateLevel(state.rng, state.level);
  return { ...state, rng, lights, size: sizeForLevel(state.level), pressesLeft: budgetForLevel(state.level) };
}

/** Partida nueva. `level` solo para el modo práctica: las que cuentan empiezan siempre en el 1. */
export function newGame(seed: number, level = 1): LightsOutState {
  return startLevel({ seed, rng: createRng(seed), level, completed: 0, presses: "", over: false });
}

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Una letra por pulsación: el índice de la casilla (hasta 7 × 7 = 49 casillas). */
export function encodeCell(cell: number): string {
  return ALPHABET[cell]!;
}

export function press(state: LightsOutState, cell: number): LightsOutState {
  if (state.over || cell < 0 || cell >= state.size * state.size) return state;

  const lights = toggle(state.lights, state.size, cell);
  const presses = state.presses + encodeCell(cell);
  const pressesLeft = state.pressesLeft - 1;

  if (!lights.some(Boolean)) {
    return startLevel({ ...state, level: state.level + 1, completed: state.completed + 1, presses });
  }
  return { ...state, lights, presses, pressesLeft, over: pressesLeft === 0 };
}

export type ReplayResult = { valid: true; state: LightsOutState } | { valid: false; reason: string };

/** Repite una partida desde la semilla. Se puede haber plantado antes de quedarse sin pulsaciones. */
export function replay(seed: number, encoded: string): ReplayResult {
  let state = newGame(seed);
  for (const code of encoded) {
    const cell = ALPHABET.indexOf(code);
    if (state.over) return { valid: false, reason: "Pulsaciones después de terminar" };
    if (cell < 0 || cell >= state.size * state.size) return { valid: false, reason: `Casilla no válida: "${code}"` };
    state = press(state, cell);
  }
  return { valid: true, state };
}
