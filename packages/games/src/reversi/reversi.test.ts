import { describe, expect, it } from "vitest";
import { createRng, nextInt } from "../rng";
import { PASS, SIZE, legalMoves, newGame, play, replay, type ReversiState } from ".";

/** Una partida entera con jugadas al azar (pero siempre la misma para cada semilla). */
function randomGame(seed: number): ReversiState {
  let rng = createRng(seed);
  let state = newGame();
  while (state.turn) {
    const options = legalMoves(state.board, state.turn);
    const [pick, next] = nextInt(rng, options.length);
    rng = next;
    const result = play(state, state.turn, options[pick]!);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  return state;
}

describe("Reversi", () => {
  it("empieza con cuatro fichas y cuatro jugadas para X", () => {
    const state = newGame();
    expect(state.score).toEqual({ x: 2, o: 2 });
    expect(legalMoves(state.board, "x")).toEqual([2 * SIZE + 3, 3 * SIZE + 2, 4 * SIZE + 5, 5 * SIZE + 4]);
  });

  it("da la vuelta a las fichas encerradas", () => {
    const state = replay([2 * SIZE + 3])!;
    expect(state.board[3 * SIZE + 3]).toBe("x");
    expect(state.flipped).toEqual([3 * SIZE + 3]);
    expect(state.score).toEqual({ x: 4, o: 1 });
    expect(state.turn).toBe("o");
  });

  it("rechaza jugadas que no encierran nada, ocupadas o fuera de turno", () => {
    const state = newGame();
    expect(play(state, "x", 0)).toEqual({ ok: false, error: "illegal" });
    expect(play(state, "x", 3 * SIZE + 3)).toEqual({ ok: false, error: "occupied" });
    expect(play(state, "o", 2 * SIZE + 3)).toEqual({ ok: false, error: "not_your_turn" });
    expect(play(state, "x", 64)).toEqual({ ok: false, error: "invalid_cell" });
  });

  it("las partidas acaban, cuadran y X juega siempre en los pares", () => {
    let withPass = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const state = randomGame(seed);
      expect(state.turn).toBeNull();
      expect(state.score.x + state.score.o).toBe(state.board.filter(Boolean).length);
      if (state.draw) expect(state.winner).toBeNull();
      else expect(state.winner).toBe(state.score.x > state.score.o ? "x" : "o");
      expect(replay(state.moves)?.score).toEqual(state.score);

      // Repetida paso a paso, cada jugada real la hace quien dice su posición.
      let partial = newGame();
      state.moves.forEach((cell, i) => {
        if (cell === PASS) return;
        const result = play(partial, i % 2 === 0 ? "x" : "o", cell);
        expect(result.ok).toBe(true);
        if (result.ok) partial = result.state;
      });
      if (state.moves.includes(PASS)) withPass++;
    }
    // Con tantas partidas, alguna tiene que tener un turno perdido.
    expect(withPass).toBeGreaterThan(0);
  });

  it("no acepta un PASS de más ni que falte", () => {
    const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((s) => randomGame(s).moves.includes(PASS))!;
    const moves = randomGame(seed).moves;
    const at = moves.indexOf(PASS);
    expect(replay([...moves.slice(0, at), ...moves.slice(at + 1)])).toBeNull();
    expect(replay([PASS, ...moves])).toBeNull();
    expect(replay([2 * SIZE + 3, PASS])).toBeNull();
  });
});
