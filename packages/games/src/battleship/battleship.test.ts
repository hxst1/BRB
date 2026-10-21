import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { FLEET_CELLS, decodeShot, encodeShot, isValidFleet, randomFleet, replay, shoot, type Fleet } from ".";

// Barcos en filas separadas, pegados a la izquierda.
const FLEET_A: Fleet = [
  [0, 1, 2, 3, 4],
  [20, 21, 22, 23],
  [40, 41, 42],
  [60, 61, 62],
  [80, 81],
];

describe("hundir la flota", () => {
  it("valida la flota", () => {
    expect(isValidFleet(FLEET_A)).toBe(true);
    expect(isValidFleet([[9, 19, 29, 39, 49], ...FLEET_A.slice(1)])).toBe(true); // vertical
    expect(isValidFleet(FLEET_A.slice(1))).toBe(false); // faltan barcos
    expect(isValidFleet([[0, 1, 2, 3, 4], [4, 5, 6, 7], ...FLEET_A.slice(2)])).toBe(false); // se solapan
    expect(isValidFleet([[8, 9, 10, 11, 12], ...FLEET_A.slice(1)])).toBe(false); // salta de fila
    expect(isValidFleet([[0, 2, 4, 6, 8], ...FLEET_A.slice(1)])).toBe(false); // no es contiguo
    expect(isValidFleet([[0, 1, 2, 3, 4], [20, 21, 22, 23], [40, 41, 42], [60, 61, 62], [80, 81, 82]])).toBe(false); // largos mal
    expect(isValidFleet("nada")).toBe(false);
  });

  it("coloca flotas válidas al azar, sin barcos pegados", () => {
    let rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const placed = randomFleet(rng);
      expect(isValidFleet(placed.fleet)).toBe(true);
      // Ninguna casilla de un barco toca (ni en diagonal) a otro barco.
      placed.fleet.forEach((ship, s) => {
        const others = new Set(placed.fleet.filter((_, o) => o !== s).flat());
        for (const cell of ship) {
          for (const dr of [-1, 0, 1]) {
            for (const dc of [-1, 0, 1]) {
              const r = Math.floor(cell / 10) + dr;
              const c = (cell % 10) + dc;
              if (r >= 0 && r < 10 && c >= 0 && c < 10) expect(others.has(r * 10 + c)).toBe(false);
            }
          }
        }
      });
      rng = placed.rng;
    }
  });

  it("codifica casilla y resultado en un número", () => {
    expect(decodeShot(encodeShot(57, "sunk"))).toEqual({ cell: 57, result: "sunk" });
    expect(decodeShot(347)).toBeNull();
  });

  it("agua, tocado y hundido", () => {
    let moves: number[] = [];
    const fire = (shooter: "x" | "o", cell: number) => {
      const result = shoot(moves, shooter, FLEET_A, cell);
      if (!result.ok) throw new Error(result.error);
      moves = result.moves;
      return result.result;
    };
    expect(fire("x", 99)).toBe("miss");
    fire("o", 0);
    expect(fire("x", 80)).toBe("hit");
    fire("o", 1);
    expect(fire("x", 81)).toBe("sunk");
    expect(shoot(moves, "x", FLEET_A, 5)).toEqual({ ok: false, error: "not_your_turn" });
    fire("o", 2);
    expect(shoot(moves, "x", FLEET_A, 80)).toEqual({ ok: false, error: "already_shot" });
  });

  it("gana quien hunde toda la flota", () => {
    let moves: number[] = [];
    const targets = FLEET_A.flat();
    for (let i = 0; i < targets.length; i++) {
      const x = shoot(moves, "x", FLEET_A, targets[i]!);
      if (!x.ok) throw new Error(x.error);
      moves = x.moves;
      if (x.winner) break;
      const o = shoot(moves, "o", FLEET_A, 99 - i);
      if (!o.ok) throw new Error(o.error);
      moves = o.moves;
    }
    const state = replay(moves)!;
    expect(state.winner).toBe("x");
    expect(state.turn).toBeNull();
    expect(state.shots.x.filter((s) => s.result !== "miss")).toHaveLength(FLEET_CELLS);
    expect(shoot(moves, "o", FLEET_A, 50)).toEqual({ ok: false, error: "game_over" });
  });

  it("rechaza partidas con disparos repetidos o mal codificados", () => {
    expect(replay([5, 6, 5])).toBeNull();
    expect(replay([350])).toBeNull();
  });
});
