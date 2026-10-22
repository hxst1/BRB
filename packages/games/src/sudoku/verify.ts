import { decodeGrid, generate, isSolved, type Difficulty } from ".";

/** Una partida abierta más tiempo que esto ya no cuenta. */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

/** Tiempo mínimo por casilla rellenada: ni el más rápido baja de aquí a mano. */
export const MIN_MS_PER_CELL = 400;

export type VerifyResult = { valid: true; timeMs: number; filled: number } | { valid: false; reason: string };

/**
 * Valida un sudoku terminado: se regenera desde la semilla y el tablero
 * enviado tiene que ser su solución (única). La puntuación es el tiempo que
 * mide el servidor.
 */
export function verifyRun(difficulty: Difficulty, seed: number, grid: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) return { valid: false, reason: "La partida ha caducado" };

  const values = decodeGrid(grid);
  if (!values) return { valid: false, reason: "Tablero mal codificado" };

  const { puzzle, solution } = generate(difficulty, seed);
  if (!isSolved(values, solution)) return { valid: false, reason: "No es la solución" };

  const filled = puzzle.filter((digit) => digit === 0).length;
  if (elapsedMs < filled * MIN_MS_PER_CELL) {
    return { valid: false, reason: `Demasiado rápido (${filled} casillas en ${elapsedMs} ms)` };
  }
  return { valid: true, timeMs: elapsedMs, filled };
}
