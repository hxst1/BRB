import { replay } from ".";

/** Una partida abierta más tiempo que esto ya no cuenta (evita guardar semillas para luego). */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

/** Margen para la latencia entre empezar la partida en el servidor y el primer tic. */
const GRACE_MS = 2_000;

export type VerifyResult =
  | { valid: true; score: number; length: number; apples: number }
  | { valid: false; reason: string };

/**
 * Valida una partida enviada por el cliente: la repite desde la semilla y
 * comprueba que no ha durado menos de lo que tardan sus tics (no se puede
 * jugar más rápido que el reloj del juego; más lento sí, p. ej. en pausa).
 */
export function verifyRun(seed: number, turns: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) {
    return { valid: false, reason: "La partida ha caducado" };
  }

  const result = replay(seed, turns);
  if (!result.valid) return result;

  if (result.durationMs > elapsedMs + GRACE_MS) {
    return { valid: false, reason: `Demasiado rápida (${result.durationMs} ms de juego en ${elapsedMs} ms)` };
  }

  return {
    valid: true,
    score: result.state.score,
    length: result.state.body.length,
    apples: result.state.apples,
  };
}
