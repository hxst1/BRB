import { finalScore, replay, type Board } from ".";

/** Una partida abierta más tiempo que esto ya no cuenta. */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

export type VerifyResult = { valid: true; score: number; fails: number } | { valid: false; reason: string };

/**
 * Valida una partida con los giros que apuntó el servidor (no los que diga el
 * cliente): tiene que estar terminada. La rapidez cuenta con el tiempo que ha
 * medido el servidor.
 */
export function verifyRun(board: Board, flips: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) return { valid: false, reason: "La partida ha caducado" };
  const result = replay(board, flips);
  if (!result.valid) return result;
  if (!result.state.over) return { valid: false, reason: "Partida sin terminar" };
  return { valid: true, score: finalScore(result.state, elapsedMs), fails: result.state.fails };
}
