import { describe, expect, it } from "vitest";
import { MAX_SIZE, budgetForLevel, encodeCell, newGame, press, replay, sizeForLevel, toggle, type LightsOutState } from ".";
import { verifyRun } from "./verify";

/**
 * Resuelve el nivel en curso por fuerza bruta sobre la primera fila
 * ("perseguir las luces"): prueba cada combinación de la primera fila, baja
 * las luces fila a fila y se queda con la que deja todo apagado con menos pulsaciones.
 */
function solve(state: LightsOutState): number[] {
  const { size } = state;
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << size; mask++) {
    let lights = state.lights;
    const presses: number[] = [];
    for (let c = 0; c < size; c++) {
      if (mask & (1 << c)) {
        lights = toggle(lights, size, c);
        presses.push(c);
      }
    }
    for (let r = 1; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (lights[(r - 1) * size + c]) {
          lights = toggle(lights, size, r * size + c);
          presses.push(r * size + c);
        }
      }
    }
    if (!lights.some(Boolean) && (!best || presses.length < best.length)) best = presses;
  }
  if (!best) throw new Error("sin solución");
  return best;
}

function solveLevels(seed: number, levels: number): LightsOutState {
  let state = newGame(seed);
  for (let i = 0; i < levels; i++) for (const cell of solve(state)) state = press(state, cell);
  return state;
}

describe("lights out", () => {
  it("toggle cambia la casilla y sus vecinas, sin salirse", () => {
    const lights = toggle(Array(9).fill(false), 3, 0);
    expect(lights.map(Number)).toEqual([1, 1, 0, 1, 0, 0, 0, 0, 0]);
    expect(toggle(lights, 3, 0).some(Boolean)).toBe(false);
  });

  it("el tablero crece hasta 7 × 7", () => {
    expect([1, 2, 3, 5, 7, 9, 30].map(sizeForLevel)).toEqual([3, 3, 4, 5, 6, 7, MAX_SIZE]);
  });

  it("la misma semilla da los mismos tableros", () => {
    expect(newGame(5).lights).toEqual(newGame(5).lights);
    expect(newGame(5).lights.some(Boolean)).toBe(true);
  });

  it("cada nivel se puede resolver dentro del límite", () => {
    let state = newGame(12345);
    for (let level = 1; level <= 14; level++) {
      const solution = solve(state);
      expect(solution.length).toBeLessThanOrEqual(budgetForLevel(level));
      for (const cell of solution) state = press(state, cell);
      expect(state.completed).toBe(level);
    }
    expect(state.size).toBe(7);
  });

  it("resolver con la última pulsación supera el nivel", () => {
    let state = newGame(4242);
    const solution = solve(state);
    // Gasta las de sobra en pares sobre una casilla (se anulan) para llegar justo.
    const spare = budgetForLevel(1) - solution.length;
    const filler = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => !solution.includes(c))!;
    for (let i = 0; i < spare - (spare % 2); i++) state = press(state, filler);
    for (const cell of solution) state = press(state, cell);
    expect(state.completed).toBe(1);
    expect(state.over).toBe(false);
    expect(replay(4242, state.presses)).toMatchObject({ valid: true });
  });

  it("al quedarse sin pulsaciones se acaba la partida", () => {
    let state = newGame(1);
    // Pulsar dos veces la misma casilla no avanza.
    while (!state.over) state = press(state, 0);
    expect(state.completed).toBe(0);
    expect(state.presses).toHaveLength(budgetForLevel(1));
    expect(press(state, 1)).toBe(state);
  });
});

describe("replay y validación", () => {
  it("repite la partida y cuenta los niveles", () => {
    const played = solveLevels(77, 6);
    const result = replay(77, played.presses);
    expect(result.valid && result.state.completed).toBe(6);
  });

  it("rechaza casillas fuera del tablero o pulsaciones tras terminar", () => {
    expect(replay(1, encodeCell(9)).valid).toBe(false);
    expect(replay(1, "0".repeat(budgetForLevel(1) + 1)).valid).toBe(false);
  });

  it("rechaza ritmos imposibles y partidas caducadas", () => {
    const played = solveLevels(77, 6);
    expect(verifyRun(77, played.presses, 60_000)).toMatchObject({ valid: true, score: 6 });
    expect(verifyRun(77, played.presses, 0)).toMatchObject({ valid: false });
    expect(verifyRun(77, played.presses, 7 * 60 * 60 * 1000)).toMatchObject({ valid: false });
  });
});
