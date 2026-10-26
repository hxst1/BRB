import { isWon, replay } from ".";

/** Una partida abierta más tiempo que esto ya no cuenta. */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

/** Tiempo mínimo por movimiento: ni el más rápido baja de aquí a mano (al final, las cartas suben solas, pero muy por encima). */
export const MIN_MS_PER_MOVE = 120;

export type VerifyResult = { valid: true; timeMs: number; moves: number } | { valid: false; reason: string };

/**
 * Valida un solitario terminado: se repite desde la semilla y tienen que
 * acabar las 52 cartas en los montones finales. La puntuación es el tiempo
 * que mide el servidor.
 */
export function verifyRun(seed: number, moves: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) return { valid: false, reason: "La partida ha caducado" };

  const result = replay(seed, moves);
  if (!result.valid) return result;
  if (!isWon(result.state)) return { valid: false, reason: "La partida no está terminada" };
  if (elapsedMs < result.moves * MIN_MS_PER_MOVE) {
    return { valid: false, reason: `Demasiado rápido (${result.moves} movimientos en ${elapsedMs} ms)` };
  }
  return { valid: true, timeMs: elapsedMs, moves: result.moves };
}
