import { replay, type Difficulty } from ".";

/** Ritmo máximo de casillas abiertas a mano: ni con prisa se abren más. */
export const MAX_OPENS_PER_SECOND = 12;

/** Una partida abierta más tiempo que esto ya no cuenta. */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

const GRACE_MS = 1_000;

export type VerifyResult = { valid: true; timeMs: number; opens: number } | { valid: false; reason: string };

/**
 * Valida una partida de buscaminas. La puntuación es el tiempo que mide el
 * servidor (de la primera casilla a la partida resuelta), no el del cliente.
 */
export function verifyRun(difficulty: Difficulty, seed: number, opened: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) return { valid: false, reason: "La partida ha caducado" };

  const result = replay(difficulty, seed, opened);
  if (!result.valid) return result;

  const opens = result.state.opened.length;
  if (opens > Math.ceil(((elapsedMs + GRACE_MS) / 1000) * MAX_OPENS_PER_SECOND)) {
    return { valid: false, reason: `Demasiadas casillas para el tiempo jugado (${opens} en ${elapsedMs} ms)` };
  }
  return { valid: true, timeMs: elapsedMs, opens };
}
