import { describe, expect, it } from "vitest";
import { COLUMNS, ROWS, dropRow, newGame, play, replay } from ".";

describe("4 en raya", () => {
  it("las fichas caen a la casilla libre más baja", () => {
    const state = replay([3, 3])!;
    expect(state.board[(ROWS - 1) * COLUMNS + 3]).toBe("x");
    expect(state.board[(ROWS - 2) * COLUMNS + 3]).toBe("o");
    expect(state.last).toBe((ROWS - 2) * COLUMNS + 3);
    expect(dropRow(state.board, 3)).toBe(ROWS - 3);
  });

  it("gana en horizontal", () => {
    // X: 0 1 2 3 en la fila de abajo; O juega encima.
    const state = replay([0, 0, 1, 1, 2, 2, 3])!;
    expect(state.winner).toBe("x");
    expect(state.turn).toBeNull();
    expect(state.line).toHaveLength(4);
  });

  it("gana en vertical", () => {
    const state = replay([0, 1, 0, 1, 0, 1, 0])!;
    expect(state.winner).toBe("x");
  });

  it("gana en las dos diagonales", () => {
    // ↗ desde abajo a la izquierda.
    expect(replay([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3])!.winner).toBe("x");
    // ↖ desde abajo a la derecha.
    expect(replay([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3])!.winner).toBe("x");
  });

  it("cuenta las líneas de más de 4", () => {
    // La ficha del medio une dos tríos: 7 en línea.
    const state = replay([0, 0, 1, 1, 2, 2, 4, 4, 5, 5, 6, 6, 3])!;
    expect(state.winner).toBe("x");
    expect(state.line).toHaveLength(7);
  });

  it("rechaza jugadas imposibles", () => {
    const full = replay([0, 0, 0, 0, 0, 0])!;
    expect(play(full, "x", 0)).toEqual({ ok: false, error: "full" });
    expect(play(newGame(), "o", 0)).toEqual({ ok: false, error: "not_your_turn" });
    expect(play(newGame(), "x", 7)).toEqual({ ok: false, error: "invalid_column" });
    expect(replay([0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("empate con el tablero lleno", () => {
    // Columnas por parejas desplazadas para que nadie junte 4.
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6];
    const state = replay(order)!;
    expect(state.winner).toBeNull();
    expect(state.draw).toBe(true);
    expect(state.turn).toBeNull();
  });
});
