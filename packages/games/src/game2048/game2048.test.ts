import { describe, expect, it } from "vitest";
import {
  decodeMoves,
  encodeMoves,
  move,
  newGame,
  replay,
  SIZE,
  type Direction,
  type Game2048State,
  type Tile,
} from ".";

/** Crea un estado con un tablero concreto (0 = vacío) para probar movimientos. */
function fromValues(values: number[], seed = 1): Game2048State {
  let id = 1;
  const cells = values.map((value): Tile | null => (value ? { id: id++, value } : null));
  return { ...newGame(seed), cells, nextTileId: id, score: 0, moves: "" };
}

function values(state: Game2048State): number[] {
  return state.cells.map((tile) => tile?.value ?? 0);
}

/** Valores del tablero ignorando la ficha que aparece tras el movimiento. */
function valuesWithoutSpawn(state: Game2048State): number[] {
  return state.cells.map((tile) => (tile && !tile.isNew ? tile.value : 0));
}

describe("newGame", () => {
  it("empieza con dos fichas de 2 o 4", () => {
    const tiles = newGame(42).cells.filter((tile) => tile !== null);
    expect(tiles).toHaveLength(2);
    for (const tile of tiles) expect([2, 4]).toContain(tile.value);
  });

  it("es determinista para la misma semilla", () => {
    expect(values(newGame(1234))).toEqual(values(newGame(1234)));
  });
});

describe("move", () => {
  it("desliza y fusiona hacia la izquierda", () => {
    // prettier-ignore
    const state = fromValues([
      2, 2, 0, 0,
      2, 0, 2, 4,
      4, 4, 4, 4,
      2, 2, 2, 0,
    ]);
    const next = move(state, "left");
    // prettier-ignore
    expect(valuesWithoutSpawn(next)).toEqual([
      4, 0, 0, 0,
      4, 4, 0, 0,
      8, 8, 0, 0,
      4, 2, 0, 0,
    ]);
    expect(next.score).toBe(4 + 4 + 8 + 8 + 4);
  });

  it("no fusiona dos veces la misma ficha en un turno", () => {
    const next = move(fromValues([4, 2, 2, 0, ...Array(12).fill(0)]), "left");
    expect(valuesWithoutSpawn(next).slice(0, SIZE)).toEqual([4, 4, 0, 0]);
  });

  it("desliza en las cuatro direcciones", () => {
    const corner = [2, ...Array(15).fill(0)];
    expect(valuesWithoutSpawn(move(fromValues(corner), "right"))[3]).toBe(2);
    expect(valuesWithoutSpawn(move(fromValues(corner), "down"))[12]).toBe(2);
    const opposite = [...Array(15).fill(0), 2];
    expect(valuesWithoutSpawn(move(fromValues(opposite), "left"))[12]).toBe(2);
    expect(valuesWithoutSpawn(move(fromValues(opposite), "up"))[3]).toBe(2);
  });

  it("devuelve el mismo estado si nada se mueve", () => {
    const state = fromValues([2, 4, 0, 0, ...Array(12).fill(0)]);
    expect(move(state, "left")).toBe(state);
    expect(move(state, "up")).toBe(state);
  });

  it("añade una ficha nueva y registra el movimiento", () => {
    const next = move(fromValues([0, 0, 0, 2, ...Array(12).fill(0)]), "left");
    expect(next.cells.filter((tile) => tile !== null)).toHaveLength(2);
    expect(next.moves).toBe("L");
  });

  it("marca la partida como terminada cuando no quedan movimientos", () => {
    // Tras mover a la derecha solo queda libre la esquina superior izquierda,
    // y la ficha que aparece ahí (2 o 4) no puede fusionarse con 16 ni con 32.
    // prettier-ignore
    const state = fromValues([
      16, 32, 64, 0,
      32, 64, 128, 256,
      64, 128, 256, 512,
      128, 256, 512, 1024,
    ]);
    const next = move(state, "right");
    expect(next.cells.every((tile) => tile !== null)).toBe(true);
    expect(next.over).toBe(true);
  });

  it("conserva la identidad de las fichas que solo se deslizan", () => {
    const state = fromValues([0, 0, 0, 2, ...Array(12).fill(0)]);
    const id = state.cells[3]!.id;
    expect(move(state, "left").cells[0]!.id).toBe(id);
  });
});

describe("replay", () => {
  function play(seed: number, attempts: Direction[]): Game2048State {
    return attempts.reduce(move, newGame(seed));
  }

  it("reproduce exactamente una partida a partir de semilla y movimientos", () => {
    const directions: Direction[] = ["left", "up", "right", "down"];
    const attempts = Array.from({ length: 300 }, (_, i) => directions[(i * 7 + (i >> 2)) % 4]!);
    const played = play(987654, attempts);

    const result = replay(987654, played.moves);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.state.score).toBe(played.score);
      expect(values(result.state)).toEqual(values(played));
    }
  });

  it("rechaza movimientos que no cambian el tablero", () => {
    const state = newGame(5);
    const blocked = (["left", "right", "up", "down"] as const).find((d) => move(state, d) === state);
    // Con dos fichas siempre hay alguna dirección válida, pero no siempre una inválida.
    if (blocked) expect(replay(5, encodeMoves([blocked])).valid).toBe(false);
  });

  it("rechaza códigos desconocidos", () => {
    expect(replay(5, "LX").valid).toBe(false);
  });
});

describe("encodeMoves / decodeMoves", () => {
  it("son inversas", () => {
    const directions: Direction[] = ["up", "left", "down", "right"];
    expect(decodeMoves(encodeMoves(directions))).toEqual(directions);
  });
});
