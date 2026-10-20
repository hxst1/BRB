import { describe, expect, it } from "vitest";
import { GRID, POINTS_PER_APPLE, canTurn, decodeTurns, newGame, replay, step, tickMs, type Direction, type SnakeState } from ".";
import { verifyRun } from "./verify";

/** Juega dirigiendo la cabeza hacia la manzana (sin pisarse a sí misma en casos simples). */
function chaseFood(state: SnakeState, maxTicks: number): SnakeState {
  for (let i = 0; i < maxTicks && !state.over && state.food !== null; i++) {
    const head = state.body[0]!;
    const [hr, hc] = [Math.floor(head / GRID), head % GRID];
    const [fr, fc] = [Math.floor(state.food / GRID), state.food % GRID];
    const wanted: Direction = fc > hc ? "right" : fc < hc ? "left" : fr > hr ? "down" : "up";
    const options: Direction[] = [wanted, "up", "down", "left", "right"];
    const safe = options.find((d) => {
      if (d !== state.direction && !canTurn(state, d)) return false;
      const next = step(state, d === state.direction ? undefined : d);
      return !next.over;
    });
    state = step(state, safe && safe !== state.direction ? safe : undefined);
  }
  return state;
}

describe("snake", () => {
  it("empieza con 3 casillas mirando a la derecha y una manzana libre", () => {
    const state = newGame(42);
    expect(state.body).toHaveLength(3);
    expect(state.direction).toBe("right");
    expect(state.food).not.toBeNull();
    expect(state.body).not.toContain(state.food);
  });

  it("la misma semilla da la misma manzana", () => {
    expect(newGame(7).food).toBe(newGame(7).food);
  });

  it("no gira hacia atrás ni cuenta giros inútiles", () => {
    const state = newGame(1);
    expect(canTurn(state, "left")).toBe(false);
    expect(canTurn(state, "right")).toBe(false);
    const next = step(state, "left");
    expect(next.direction).toBe("right");
    expect(next.turns).toBe("");
  });

  it("choca con la pared", () => {
    let state = newGame(1);
    for (let i = 0; i < GRID && !state.over; i++) state = step(state);
    expect(state.over).toBe(true);
  });

  it("come, crece y suma puntos", () => {
    const state = chaseFood(newGame(3), 400);
    expect(state.apples).toBeGreaterThan(3);
    expect(state.score).toBe(state.apples * POINTS_PER_APPLE);
    expect(state.body).toHaveLength(3 + state.apples);
  });

  it("acelera con las manzanas hasta un tope", () => {
    expect(tickMs(0)).toBeGreaterThan(tickMs(10));
    expect(tickMs(1000)).toBe(70);
  });

  it("codifica los giros como diferencias de tics", () => {
    let state = newGame(1);
    state = step(state);
    state = step(state, "up");
    state = step(state);
    state = step(state, "left");
    expect(state.turns).toBe("2U2L");
    expect(decodeTurns("2U2L")).toEqual([
      { tick: 2, direction: "up" },
      { tick: 4, direction: "left" },
    ]);
  });

  it("rechaza giros mal escritos", () => {
    for (const bad of ["0U", "U", "2X", "02U", "2U ", "-1U"]) expect(decodeTurns(bad)).toBeNull();
    expect(decodeTurns("")).toEqual([]);
  });
});

describe("replay y validación", () => {
  const played = chaseFood(newGame(99), 300);
  const finished = (() => {
    let state = played;
    while (!state.over) state = step(state);
    return state;
  })();

  it("la repetición da la misma puntuación que la partida", () => {
    const result = replay(99, finished.turns);
    expect(result.valid && result.state.score).toBe(finished.score);
    expect(result.valid && result.state.tick).toBe(finished.tick);
  });

  it("rechaza giros imposibles o después de chocar", () => {
    expect(replay(99, "1L").valid).toBe(false);
    expect(replay(1, `${GRID * 3}U`).valid).toBe(false);
  });

  it("acepta una partida a ritmo real y rechaza una demasiado rápida", () => {
    const result = replay(99, finished.turns);
    if (!result.valid) throw new Error("replay");
    expect(verifyRun(99, finished.turns, result.durationMs).valid).toBe(true);
    expect(verifyRun(99, finished.turns, result.durationMs / 3 - 3000)).toMatchObject({ valid: false });
  });

  it("caduca las partidas abiertas demasiado tiempo", () => {
    expect(verifyRun(99, finished.turns, 7 * 60 * 60 * 1000)).toMatchObject({ valid: false });
  });
});
