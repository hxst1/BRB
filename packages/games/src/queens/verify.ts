import { decodeQueens, generate, type Difficulty } from ".";

/** Una partida abierta más tiempo que esto (sin contar las pausas) ya no cuenta. */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

/** Tiempo mínimo por reina: ni el más rápido baja de aquí a mano. */
export const MIN_MS_PER_QUEEN = 600;

export type VerifyResult = { valid: true; timeMs: number; queens: number } | { valid: false; reason: string };

/**
 * Valida un tablero de reinas terminado: se regenera desde la semilla y las
 * reinas enviadas (la columna de cada fila) tienen que ser su solución, que
 * es única. La puntuación es el tiempo que mide el servidor.
 */
export function verifyRun(difficulty: Difficulty, seed: number, encoded: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) return { valid: false, reason: "La partida ha caducado" };

  const puzzle = generate(difficulty, seed);
  const columns = decodeQueens(puzzle.size, encoded);
  if (!columns) return { valid: false, reason: "Reinas mal codificadas" };
  if (columns.some((column, row) => column !== puzzle.solution[row])) return { valid: false, reason: "No es la solución" };

  if (elapsedMs < puzzle.size * MIN_MS_PER_QUEEN) {
    return { valid: false, reason: `Demasiado rápido (${puzzle.size} reinas en ${elapsedMs} ms)` };
  }
  return { valid: true, timeMs: elapsedMs, queens: puzzle.size };
}
