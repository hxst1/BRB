import { describe, expect, it } from "vitest";
import {
  applyMove,
  autoMove,
  decodeMoves,
  encodeMoves,
  finishingMoves,
  foundationPile,
  generate,
  isWon,
  rank,
  solve,
  suit,
  type Move,
  type Pile,
  type State,
} from ".";
import { MIN_MS_PER_MOVE, verifyRun } from "./verify";

const cards = (state: State) => [
  ...state.stock,
  ...state.waste,
  ...state.tableau.flatMap((column) => [...column.down, ...column.up]),
  ...state.foundations.flatMap((count, s) => Array.from({ length: count }, (_, i) => s * 13 + i)),
];

describe("solitario", () => {
  it("reparte las 52 cartas una vez, como en el clásico, y la misma semilla da el mismo reparto", () => {
    const state = generate(42);
    expect(cards(state).sort((a, b) => a - b)).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect(state.tableau.map((column) => column.down.length)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(state.tableau.every((column) => column.up.length === 1)).toBe(true);
    expect(state.stock).toHaveLength(24);
    expect(generate(42)).toEqual(state);
    expect(generate(43)).not.toEqual(state);
  });

  it("todos los repartos tienen solución, y jugándola con las reglas de la partida se gana", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let state = generate(seed);
      const moves = solve(state, 50_000);
      expect(moves, `semilla ${seed}`).not.toBeNull();
      for (const move of moves!) {
        const next = applyMove(state, move);
        expect(next, `semilla ${seed}: ${JSON.stringify(move)}`).not.toBeNull();
        state = next!;
      }
      expect(isWon(state)).toBe(true);
    }
  });

  it("robar pasa la carta al descarte y, con el mazo vacío, le da la vuelta", () => {
    let state = generate(1);
    const order = [...state.stock].reverse();
    for (let i = 0; i < 24; i++) state = applyMove(state, { draw: true })!;
    expect(state.stock).toHaveLength(0);
    expect(state.waste).toEqual(order);
    state = applyMove(state, { draw: true })!;
    expect(state.waste).toHaveLength(0);
    expect(applyMove(state, { draw: true })!.waste).toEqual([order[0]]);
  });

  it("solo se apila en orden descendente y alternando colores; en los finales, por palo desde el as", () => {
    const base: State = {
      stock: [],
      waste: [],
      foundations: [0, 0, 0, 0],
      tableau: [
        { down: [], up: [12] }, // K♠
        { down: [], up: [24] }, // Q♥
        { down: [], up: [11] }, // Q♠
        { down: [5], up: [0] }, // A♠ sobre una tapada
        { down: [], up: [] },
        { down: [], up: [] },
        { down: [], up: [] },
      ],
    };
    expect(applyMove(base, { from: "1", to: "0", count: 1 })).not.toBeNull();
    expect(applyMove(base, { from: "2", to: "0", count: 1 })).toBeNull();
    expect(applyMove(base, { from: "2", to: "4", count: 1 })).toBeNull();
    expect(applyMove(base, { from: "0", to: "4", count: 1 })).not.toBeNull();
    expect(applyMove(base, { from: "3", to: "B", count: 1 })).toBeNull();
    const up = applyMove(base, { from: "3", to: "A", count: 1 })!;
    expect(up.foundations).toEqual([1, 0, 0, 0]);
    expect(up.tableau[3]).toEqual({ down: [], up: [5] });
    // Y se puede bajar de un final a una columna.
    expect(applyMove(up, { from: "A", to: "3", count: 1 })).toBeNull();
  });

  it("al tocar una carta va a su final si puede y si no a la primera columna donde encaja", () => {
    const state: State = {
      stock: [],
      waste: [0],
      foundations: [0, 0, 0, 0],
      tableau: [{ down: [], up: [12] }, { down: [3], up: [24] }, { down: [], up: [] }, ...Array.from({ length: 4 }, () => ({ down: [], up: [] }))],
    };
    expect(autoMove(state, "w", 1)).toEqual({ from: "w", to: foundationPile(0), count: 1 });
    expect(autoMove(state, "1", 1)).toEqual({ from: "1", to: "0", count: 1 });
    // Un rey que ya está solo en su columna no se mueve a otra vacía.
    expect(autoMove(state, "0", 1)).toBeNull();
  });

  it("los movimientos se codifican y decodifican igual", () => {
    const moves: Move[] = [{ draw: true }, { from: "w", to: "3", count: 1 }, { from: "6", to: "0", count: 12 }, { from: "B", to: "2", count: 1 }];
    expect(decodeMoves(encodeMoves(moves))).toEqual(moves);
    expect(decodeMoves("")).toEqual([]);
    for (const bad of ["sx", "w0z", "w", "w0", "w0e", "w00", "0w1", "s s"]) expect(decodeMoves(bad)).toBeNull();
  });

  it("con todo destapado y sin mazo, las cartas suben solas hasta ganar", () => {
    const state: State = {
      stock: [],
      waste: [],
      foundations: [11, 11, 13, 13],
      tableau: [
        { down: [], up: [12, 24] }, // K♠ con la Q♥ encima
        { down: [], up: [11] }, // Q♠
        { down: [], up: [25] }, // K♥
        ...Array.from({ length: 4 }, () => ({ down: [], up: [] })),
      ],
    };
    const moves = finishingMoves(state)!;
    let current = state;
    for (const move of moves) current = applyMove(current, move)!;
    expect(isWon(current)).toBe(true);
    expect(moves).toHaveLength(4);
    // Con una tapada o con cartas en el mazo, todavía no.
    expect(finishingMoves({ ...state, stock: [0] })).toBeNull();
    expect(finishingMoves({ ...state, tableau: [{ down: [1], up: [12] }, ...state.tableau.slice(1)] })).toBeNull();
  });

  it("valida una partida ganada y rechaza las incompletas, las imposibles y las demasiado rápidas", () => {
    const moves = solve(generate(7), 50_000)!;
    const encoded = encodeMoves(moves);
    const slow = moves.length * MIN_MS_PER_MOVE + 1000;
    expect(verifyRun(7, encoded, slow)).toEqual({ valid: true, timeMs: slow, moves: moves.length });
    expect(verifyRun(7, encodeMoves(moves.slice(0, -1)), slow)).toMatchObject({ valid: false });
    expect(verifyRun(8, encoded, slow)).toMatchObject({ valid: false });
    expect(verifyRun(7, encoded, moves.length * MIN_MS_PER_MOVE - 1)).toMatchObject({ valid: false });
    expect(verifyRun(7, encoded, 7 * 60 * 60 * 1000)).toMatchObject({ valid: false });
  });

  it("la carta del montón final es la que toca", () => {
    for (const card of [0, 13, 26, 39]) expect(foundationPile(card)).toBe("ABCD"[suit(card)]);
    expect(rank(12)).toBe(13);
  });
});
