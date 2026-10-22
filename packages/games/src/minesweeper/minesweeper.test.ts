import { describe, expect, it } from "vitest";
import { DIFFICULTIES, chord, encodeOpened, neighbors, newGame, replay, reveal, type MinesweeperState } from ".";
import { verifyRun } from "./verify";

/** Resuelve la partida abriendo, una a una, todas las casillas sin mina (como haría un jugador perfecto). */
function solve(difficulty: "easy" | "medium" | "hard", seed: number, first: number): MinesweeperState {
  let state = reveal(newGame(difficulty, seed), first);
  for (let cell = 0; cell < state.columns * state.rows && state.status === "playing"; cell++) {
    if (!state.mines!.has(cell) && !state.revealed.has(cell)) state = reveal(state, cell);
  }
  return state;
}

describe("buscaminas", () => {
  it("el primer toque nunca es mina y abre una zona", () => {
    for (let seed = 0; seed < 30; seed++) {
      const state = reveal(newGame("hard", seed), 200);
      expect(state.status).toBe("playing");
      expect(state.mines!.has(200)).toBe(false);
      for (const n of neighbors(200, 16, 30)) expect(state.mines!.has(n)).toBe(false);
      expect(state.revealed.size).toBeGreaterThan(1);
      expect(state.mines!.size).toBe(DIFFICULTIES.hard.mines);
    }
  });

  it("la misma semilla y el mismo primer toque dan las mismas minas", () => {
    const a = reveal(newGame("medium", 7), 40);
    const b = reveal(newGame("medium", 7), 40);
    expect([...a.mines!]).toEqual([...b.mines!]);
  });

  it("los números cuentan las minas de alrededor", () => {
    const state = reveal(newGame("easy", 3), 40);
    for (let cell = 0; cell < 81; cell++) {
      expect(state.counts[cell]).toBe(neighbors(cell, 9, 9).filter((n) => state.mines!.has(n)).length);
    }
  });

  it("pisar una mina pierde", () => {
    let state = reveal(newGame("easy", 3), 40);
    const mine = [...state.mines!][0]!;
    state = reveal(state, mine);
    expect(state.status).toBe("lost");
    expect(state.exploded).toBe(mine);
  });

  it("despejar todo gana", () => {
    const state = solve("easy", 11, 0);
    expect(state.status).toBe("won");
    expect(state.revealed.size).toBe(81 - 10);
  });

  it("el acorde abre las vecinas si las banderas cuadran", () => {
    let state = reveal(newGame("easy", 5), 40);
    const numbered = [...state.revealed].find((c) => state.counts[c]! > 0)!;
    const flags = new Set(neighbors(numbered, 9, 9).filter((n) => state.mines!.has(n)));
    const before = state.revealed.size;
    state = chord(state, numbered, flags);
    expect(state.status).toBe("playing");
    expect(state.revealed.size).toBeGreaterThanOrEqual(before);
    for (const n of neighbors(numbered, 9, 9)) if (!flags.has(n)) expect(state.revealed.has(n)).toBe(true);
  });
});

describe("validación", () => {
  it("acepta una partida ganada y rechaza las perdidas o a medias", () => {
    const won = solve("medium", 21, 120);
    const encoded = encodeOpened(won.opened);
    expect(replay("medium", 21, encoded).valid).toBe(true);
    expect(replay("medium", 21, encodeOpened(won.opened.slice(0, -1)))).toMatchObject({ valid: false });
    const mine = [...won.mines!][0]!;
    expect(replay("medium", 21, `120,${mine}`)).toMatchObject({ valid: false });
    expect(replay("medium", 21, "120,abc")).toMatchObject({ valid: false });
    expect(replay("medium", 21, "")).toMatchObject({ valid: false });
  });

  it("el tiempo es el del servidor y se rechazan ritmos imposibles", () => {
    const won = solve("easy", 11, 0);
    const encoded = encodeOpened(won.opened);
    expect(verifyRun("easy", 11, encoded, 30_000)).toMatchObject({ valid: true, timeMs: 30_000 });
    expect(verifyRun("easy", 11, encoded, 0)).toMatchObject({ valid: false });
  });
});
