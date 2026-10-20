import { describe, expect, it } from "vitest";
import { newGame, play, replay } from ".";

describe("play", () => {
  it("alterna turnos empezando por X", () => {
    const first = play(newGame(), "x", 4);
    expect(first.ok && first.state.turn).toBe("o");
  });

  it("rechaza jugar fuera de turno, en casilla ocupada o fuera del tablero", () => {
    const state = replay([4])!;
    expect(play(state, "x", 0)).toEqual({ ok: false, error: "not_your_turn" });
    expect(play(state, "o", 4)).toEqual({ ok: false, error: "occupied" });
    expect(play(state, "o", 9)).toEqual({ ok: false, error: "invalid_cell" });
    expect(play(state, "o", 1.5)).toEqual({ ok: false, error: "invalid_cell" });
  });

  it("detecta victoria y la línea ganadora", () => {
    // X: 0, 1, 2 — O: 3, 4
    const state = replay([0, 3, 1, 4, 2])!;
    expect(state).toMatchObject({ winner: "x", line: [0, 1, 2], turn: null, draw: false });
    expect(play(state, "o", 5)).toEqual({ ok: false, error: "game_over" });
  });

  it("detecta victoria en diagonal para O", () => {
    expect(replay([0, 2, 1, 4, 8, 6])).toMatchObject({ winner: "o", line: [2, 4, 6] });
  });

  it("detecta empate", () => {
    // x o x / x o o / o x x
    expect(replay([0, 1, 2, 4, 3, 5, 7, 6, 8])).toMatchObject({ draw: true, winner: null, turn: null });
  });

  it("gana aunque sea en la última casilla", () => {
    // La novena jugada completa una línea: es victoria, no empate.
    expect(replay([0, 1, 2, 4, 3, 5, 7, 8, 6])).toMatchObject({ winner: "x", line: [0, 3, 6], draw: false });
  });
});

describe("replay", () => {
  it("devuelve null con movimientos inválidos", () => {
    expect(replay([4, 4])).toBeNull();
    expect(replay([0, 3, 1, 4, 2, 5])).toBeNull();
  });
});
