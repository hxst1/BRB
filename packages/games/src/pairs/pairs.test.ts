import { describe, expect, it } from "vitest";
import { CARDS, PAIRS, canFlip, dealBoard, decodeFlips, encodeCard, finalScore, flip, newGame, replay, timeBonus, type Board, type PairsState } from ".";
import { verifyRun } from "./verify";

/** Las dos cartas de cada pareja. */
function positions(board: Board): [number, number][] {
  const result: [number, number][] = Array.from({ length: PAIRS }, () => [-1, -1]);
  board.forEach((pair, card) => {
    const slot = result[pair]!;
    if (slot[0] < 0) slot[0] = card;
    else slot[1] = card;
  });
  return result;
}

/** Las dos cartas de la pareja `pair`. */
const cardsOf = (board: Board, pair: number): [number, number] => positions(board)[pair]!;

/** Juega sin fallar: todas las parejas seguidas. */
function perfect(board: Board): PairsState {
  let state = newGame();
  for (const [a, b] of positions(board)) state = flip(flip(state, board, a), board, b);
  return state;
}

describe("parejas", () => {
  it("reparte 10 parejas y la misma semilla da el mismo tablero", () => {
    const board = dealBoard(42);
    expect(board).toHaveLength(CARDS);
    for (let pair = 0; pair < PAIRS; pair++) expect(board.filter((p) => p === pair)).toHaveLength(2);
    expect(dealBoard(42)).toEqual(board);
    expect(dealBoard(43)).not.toEqual(board);
  });

  it("una pareja suma 100 y las seguidas, 50 más cada una", () => {
    const board = dealBoard(1);
    const [a, b] = cardsOf(board, 0);
    const [c, d] = cardsOf(board, 1);
    const [e, f] = cardsOf(board, 2);
    let state = flip(flip(newGame(), board, a), board, b);
    expect(state.points).toBe(100);
    state = flip(flip(state, board, c), board, d);
    expect(state.points).toBe(100 + 150);
    state = flip(flip(state, board, e), board, f);
    expect(state.points).toBe(100 + 150 + 200);
    expect(state.bestStreak).toBe(3);
  });

  it("un fallo resta 20 y corta la racha", () => {
    const board = dealBoard(2);
    const [a, b] = cardsOf(board, 0);
    const [c] = cardsOf(board, 1);
    const [e] = cardsOf(board, 2);
    let state = flip(flip(newGame(), board, a), board, b);
    state = flip(flip(state, board, c), board, e);
    expect(state.fails).toBe(1);
    expect(state.streak).toBe(0);
    expect(state.points).toBe(80);
  });

  it("no se gira una carta emparejada ni la misma dos veces", () => {
    const board = dealBoard(3);
    const [a, b] = cardsOf(board, 0);
    const open = flip(newGame(), board, a);
    expect(canFlip(open, a)).toBe(false);
    const matched = flip(open, board, b);
    expect(canFlip(matched, a)).toBe(false);
    expect(canFlip(matched, b)).toBe(false);
    expect(canFlip(matched, CARDS)).toBe(false);
  });

  it("sin fallar y rápido, la máxima puntuación", () => {
    const state = perfect(dealBoard(4));
    expect(state.over).toBe(true);
    // 10 parejas seguidas: 100 × 10 + 50 × (0 + 1 + … + 9).
    expect(state.points).toBe(1000 + 50 * 45);
    expect(timeBonus(30_000)).toBe(600);
    expect(timeBonus(120_000)).toBe(0);
    expect(finalScore(state, 30_000)).toBe(1000 + 2250 + 600);
  });

  it("la puntuación final no baja de 0", () => {
    const board = dealBoard(5);
    const [a] = cardsOf(board, 0);
    const [c] = cardsOf(board, 1);
    let state = newGame();
    for (let i = 0; i < 30; i++) state = flip(flip(state, board, a), board, c);
    expect(state.points).toBe(-600);
    expect(finalScore(state, 200_000)).toBe(0);
  });

  it("codifica los giros en un carácter y la repetición da lo mismo", () => {
    expect(decodeFlips(encodeCard(0) + encodeCard(19) + encodeCard(10))).toEqual([0, 19, 10]);
    expect(decodeFlips("k")).toBeNull();
    const board = dealBoard(6);
    const state = perfect(board);
    const result = replay(board, state.flips);
    expect(result.valid && result.state.points).toBe(state.points);
    expect(replay(board, "00")).toEqual({ valid: false, reason: "Giro imposible (2.º)" });
  });

  it("valida solo partidas terminadas", () => {
    const board = dealBoard(7);
    const state = perfect(board);
    expect(verifyRun(board, state.flips, 40_000)).toEqual({ valid: true, score: finalScore(state, 40_000), fails: 0 });
    expect(verifyRun(board, state.flips.slice(0, 4), 40_000)).toEqual({ valid: false, reason: "Partida sin terminar" });
    expect(verifyRun(board, state.flips, 7 * 60 * 60 * 1000)).toEqual({ valid: false, reason: "La partida ha caducado" });
  });
});
