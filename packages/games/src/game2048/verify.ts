import { maxTile, replay } from ".";

/** Ritmo medio máximo: ni deslizando a lo loco se sostiene más durante una partida. */
export const MAX_MOVES_PER_SECOND = 10;

/** Una partida abierta más tiempo que esto ya no cuenta (evita guardar semillas para luego). */
export const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;

/** Margen para la latencia entre empezar la partida en el servidor y el primer movimiento. */
const GRACE_MS = 2_000;

export type VerifyResult =
  | { valid: true; score: number; maxTile: number; moveCount: number }
  | { valid: false; reason: string };

/**
 * Valida una partida enviada por el cliente: comprueba que el ritmo de
 * movimientos sea humanamente posible y la repite desde la semilla.
 */
export function verifyRun(seed: number, moves: string, elapsedMs: number): VerifyResult {
  if (elapsedMs > MAX_RUN_DURATION_MS) {
    return { valid: false, reason: "La partida ha caducado" };
  }

  // Comprobación barata antes de simular la partida entera.
  const maxMoves = Math.ceil(((elapsedMs + GRACE_MS) / 1000) * MAX_MOVES_PER_SECOND);
  if (moves.length > maxMoves) {
    return { valid: false, reason: `Demasiados movimientos para el tiempo jugado (${moves.length} en ${elapsedMs} ms)` };
  }

  const result = replay(seed, moves);
  if (!result.valid) return result;

  return {
    valid: true,
    score: result.state.score,
    maxTile: maxTile(result.state),
    moveCount: moves.length,
  };
}
