import { describe, expect, it } from "vitest";
import { GRID, START, TRAIL_LENGTH, WIN_ROUNDS, newGame, occupancy, ownerOf, step, type TronState } from ".";

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

  it("la estela solo dura TRAIL_LENGTH casillas: lo más antiguo se borra", () => {
    // X va recta: tras TRAIL_LENGTH + 1 pasos (aún no ha llegado al borde) su salida ya se ha borrado.
    let state = newGame();
    for (let i = 0; i < TRAIL_LENGTH + 1; i++) state = step(state);
    expect(state.roundOver).toBeNull();
    expect(state.riders.x.trail).toHaveLength(TRAIL_LENGTH);
    expect(state.riders.x.trail.at(-1)).toBe(state.riders.x.head);
    expect(ownerOf(state.trails, START.x.cell)).toBeNull();
    expect(occupancy(state.riders)).toEqual(state.trails);
  });

  it("se puede pasar por donde ya se ha borrado la estela", () => {
    // X da la vuelta en U a lo largo y vuelve por la fila de al lado; cuando
    // vuelve a cruzar su salida, esa parte ya se ha borrado.
    let state = newGame();
    const turns: Parameters<typeof step>[1][] = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) turns.push({});
    turns[3] = { x: "up" };
    turns[4] = { x: "left" };
    turns[5] = { x: "down" };
    turns[7] = { x: "right" };
    for (const t of turns) state = step(state, t);
    expect(state.riders.x.alive).toBe(true);
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
