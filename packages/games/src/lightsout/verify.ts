import { replay } from ".";

/** Ritmo medio máximo de pulsaciones durante una partida. */
export const MAX_PRESSES_PER_SECOND = 10;

/** Una partida abierta más tiempo que esto ya no cuenta (evita guardar semillas para luego). */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

/** Margen para la latencia entre empezar la partida en el servidor y la primera pulsación. */
const GRACE_MS = 2_000;

export type VerifyResult =
  | { valid: true; score: number; presses: number }
  | { valid: false; reason: string };

/** Valida una partida: ritmo humanamente posible y repetición desde la semilla. */
export function verifyRun(seed: number, presses: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) {
    return { valid: false, reason: "La partida ha caducado" };
  }

  const maxPresses = Math.ceil(((elapsedMs + GRACE_MS) / 1000) * MAX_PRESSES_PER_SECOND);
  if (presses.length > maxPresses) {
    return { valid: false, reason: `Demasiadas pulsaciones para el tiempo jugado (${presses.length} en ${elapsedMs} ms)` };
  }

  const result = replay(seed, presses);
  if (!result.valid) return result;
  return { valid: true, score: result.state.completed, presses: presses.length };
}
