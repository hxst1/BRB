import { describe, expect, it } from "vitest";
import { SIZES, conflicts, decodeQueens, encodeQueens, generate, isSolved, solutions, type Difficulty } from ".";
import { MIN_MS_PER_QUEEN, verifyRun } from "./verify";

const solutionCells = (size: number, columns: number[]) => new Set(columns.map((column, row) => row * size + column));

/** Las regiones de una pieza (sin huecos entre sus casillas). */
function connected(size: number, regions: number[], region: number): boolean {
  const cells = regions.flatMap((r, i) => (r === region ? [i] : []));
  const seen = new Set([cells[0]!]);
  const queue = [cells[0]!];
  while (queue.length) {
    const cell = queue.pop()!;
    const [row, column] = [Math.floor(cell / size), cell % size];
    for (const [r, c] of [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]] as const) {
      const other = r * size + c;
      if (r < 0 || c < 0 || r >= size || c >= size || regions[other] !== region || seen.has(other)) continue;
      seen.add(other);
      queue.push(other);
    }
  }
  return seen.size === cells.length;
}

describe("reinas", () => {
  it.each(["easy", "medium", "hard"] as Difficulty[])("en %s: N regiones de una pieza, una sola solución y válida", (difficulty) => {
    for (let seed = 1; seed <= 15; seed++) {
      const puzzle = generate(difficulty, seed);
      const size = SIZES[difficulty];
      expect(puzzle.regions).toHaveLength(size * size);
      expect(new Set(puzzle.regions).size).toBe(size);
      for (let region = 0; region < size; region++) expect(connected(size, puzzle.regions, region)).toBe(true);
      expect(solutions(size, puzzle.regions, 2)).toEqual([puzzle.solution]);
      expect(isSolved(puzzle, solutionCells(size, puzzle.solution))).toBe(true);
    }
  });

  it("la misma semilla da el mismo tablero", () => {
    expect(generate("medium", 42)).toEqual(generate("medium", 42));
    expect(generate("medium", 43).regions).not.toEqual(generate("medium", 42).regions);
  });

  it("marca las reinas que chocan: misma fila, columna o región, o tocándose en diagonal", () => {
    const size = 4;
    const regions = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3];
    expect([...conflicts(size, regions, new Set([0, 3]))].sort()).toEqual([0, 3]); // misma fila
    expect([...conflicts(size, regions, new Set([0, 5]))].sort()).toEqual([0, 5]); // tocándose (y misma región)
    expect([...conflicts(size, regions, new Set([1, 6]))].sort()).toEqual([1, 6]); // en diagonal
    expect(conflicts(size, regions, new Set([1, 7, 8, 14])).size).toBe(0);
  });

  it("las reinas se codifican como la columna de cada fila", () => {
    expect(encodeQueens(4, new Set([1, 7, 8, 14]))).toBe("1302");
    expect(decodeQueens(4, "1302")).toEqual([1, 3, 0, 2]);
    expect(decodeQueens(4, "130")).toBeNull();
    expect(decodeQueens(4, "1304")).toBeNull();
  });

  it("valida la solución y rechaza otras reinas, codificaciones raras y tiempos imposibles", () => {
    const puzzle = generate("easy", 7);
    const encoded = puzzle.solution.join("");
    const slow = 60_000;
    expect(verifyRun("easy", 7, encoded, slow)).toEqual({ valid: true, timeMs: slow, queens: 7 });
    const wrong = [...puzzle.solution];
    [wrong[0], wrong[1]] = [wrong[1]!, wrong[0]!];
    expect(verifyRun("easy", 7, wrong.join(""), slow)).toMatchObject({ valid: false });
    expect(verifyRun("easy", 8, encoded, slow).valid).toBe(generate("easy", 8).solution.join("") === encoded);
    expect(verifyRun("easy", 7, "abc", slow)).toMatchObject({ valid: false });
    expect(verifyRun("easy", 7, encoded, 7 * MIN_MS_PER_QUEEN - 1)).toMatchObject({ valid: false });
    expect(verifyRun("easy", 7, encoded, 7 * 60 * 60 * 1000)).toMatchObject({ valid: false });
  });
});
