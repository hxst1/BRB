import { describe, expect, it } from "vitest";
import { move, newGame, type Direction } from ".";
import { MAX_RUN_DURATION_MS, verifyRun } from "./verify";

function playSome(seed: number, count: number) {
  const directions: Direction[] = ["left", "down", "right", "up"];
  let state = newGame(seed);
  for (let i = 0; i < count * 4 && state.moves.length < count; i++) {
    state = move(state, directions[i % 4]!);
  }
  return state;
}

describe("verifyRun", () => {
  it("acepta una partida real a ritmo humano y devuelve la puntuación recalculada", () => {
    const state = playSome(321, 60);
    const result = verifyRun(321, state.moves, 60_000);
    expect(result).toMatchObject({ valid: true, score: state.score, moveCount: state.moves.length });
  });

  it("rechaza una semilla que no corresponde a los movimientos", () => {
    const state = playSome(321, 200);
    expect(verifyRun(322, state.moves, 600_000).valid).toBe(false);
  });

  it("acepta justo el ritmo máximo y rechaza un movimiento más", () => {
    const state = playSome(321, 41);
    // 2 s de juego + 2 s de margen a 10 mov/s = 40 movimientos.
    expect(verifyRun(321, state.moves.slice(0, 40), 2_000).valid).toBe(true);
    expect(verifyRun(321, state.moves.slice(0, 41), 2_000).valid).toBe(false);
  });

  it("rechaza partidas caducadas", () => {
    const state = playSome(321, 10);
    expect(verifyRun(321, state.moves, MAX_RUN_DURATION_MS + 1)).toMatchObject({ valid: false });
  });
});
