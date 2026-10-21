import { describe, expect, it } from "vitest";
import { GRID, START, WIN_ROUNDS, newGame, ownerOf, step, type TronState } from ".";

/** Avanza hasta que acaba la ronda (sin giros salvo los indicados en el primer tic). */
function untilRoundOver(state: TronState, first: Parameters<typeof step>[1] = {}): TronState {
  state = step(state, first);
  for (let i = 0; i < GRID * 2 && !state.roundOver; i++) state = step(state);
  return state;
}

describe("tron", () => {
  it("las motos avanzan dejando estela", () => {
    const state = step(newGame());
    expect(state.riders.x.head).toBe(START.x.cell + 1);
    expect(state.riders.o.head).toBe(START.o.cell - 1);
    expect(ownerOf(state.trails, START.x.cell)).toBe("x");
    expect(ownerOf(state.trails, state.riders.x.head)).toBe("x");
  });

  it("no se puede girar hacia atrás", () => {
    expect(step(newGame(), { x: "left" }).riders.x.direction).toBe("right");
    expect(step(newGame(), { x: "up" }).riders.x.direction).toBe("up");
  });

  it("quien choca con un borde pierde la ronda", () => {
    // X sube y se estrella arriba; O sigue recto (le queda más camino).
    const state = untilRoundOver(newGame(), { x: "up" });
    expect(state.roundOver).toBe("o");
    expect(state.score).toEqual({ x: 0, o: 1 });
    expect(state.riders.x.alive).toBe(false);
  });

  it("chocar de frente en la misma casilla es empate y se repite la ronda", () => {
    // Las dos motos van una hacia la otra por filas contiguas: se ponen en la misma fila.
    let state = step(newGame(), { o: "down" });
    state = step(state, { o: "left" });
    state = untilRoundOver(state);
    expect(state.roundOver).toBe("draw");
    expect(state.score).toEqual({ x: 0, o: 0 });
  });

  it("chocar con una estela elimina", () => {
    // X sube cruzando la fila de O y deja su estela; O, que va recto por esa fila, choca con ella
    // antes de que X llegue al borde de arriba.
    let state = newGame();
    for (let i = 0; i < 10; i++) state = step(state);
    state = untilRoundOver(state, { x: "up" });
    expect(state.roundOver).toBe("x");
  });

  it("tras una ronda empieza otra y gana quien llega a WIN_ROUNDS", () => {
    let state = newGame();
    for (let round = 0; round < WIN_ROUNDS; round++) {
      state = untilRoundOver(state, { x: "up" });
      if (state.winner) break;
      state = step(state); // nueva ronda
      expect(state.round).toBe(round + 2);
      expect(state.riders.x.alive && state.riders.o.alive).toBe(true);
    }
    expect(state.winner).toBe("o");
    expect(step(state)).toBe(state);
  });
});
