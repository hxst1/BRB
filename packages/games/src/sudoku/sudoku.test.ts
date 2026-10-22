import { describe, expect, it } from "vitest";
import { CLUES, PEERS, conflicts, decodeGrid, encodeGrid, generate, isSolved, type Difficulty } from ".";
import { verifyRun } from "./verify";

/** Cuenta soluciones por fuerza bruta (independiente del generador) para comprobar la unicidad. */
function solutions(grid: number[], limit = 2): number {
  const cell = grid.indexOf(0);
  if (cell === -1) return 1;
  let found = 0;
  for (let digit = 1; digit <= 9 && found < limit; digit++) {
    if (PEERS[cell]!.some((peer) => grid[peer] === digit)) continue;
    grid[cell] = digit;
    found += solutions(grid, limit - found);
    grid[cell] = 0;
  }
  return found;
}

describe("sudoku", () => {
  it("la solución es un sudoku válido y la misma semilla da el mismo tablero", () => {
    const { solution, puzzle } = generate("medium", 42);
    expect(conflicts(solution).size).toBe(0);
    expect(solution.every((d) => d >= 1 && d <= 9)).toBe(true);
    expect(generate("medium", 42).puzzle).toEqual(puzzle);
    expect(generate("medium", 43).puzzle).not.toEqual(puzzle);
  });

  it.each(["easy", "medium", "hard"] as Difficulty[])("en %s las pistas son de la solución y la solución es única", (difficulty) => {
    for (const seed of [1, 2, 3]) {
      const { puzzle, solution } = generate(difficulty, seed);
      puzzle.forEach((digit, i) => {
        if (digit) expect(digit).toBe(solution[i]);
      });
      const clues = puzzle.filter(Boolean).length;
      expect(clues).toBeGreaterThanOrEqual(CLUES[difficulty]);
      expect(clues).toBeLessThan(CLUES[difficulty] + 6);
      expect(solutions([...puzzle])).toBe(1);
    }
  });

  it("marca los números repetidos", () => {
    const grid = Array(81).fill(0);
    grid[0] = 5;
    grid[8] = 5; // misma fila
    grid[40] = 3;
    expect([...conflicts(grid)].sort()).toEqual([0, 8]);
  });

  it("codifica el tablero en 81 cifras", () => {
    const { solution } = generate("easy", 9);
    expect(decodeGrid(encodeGrid(solution))).toEqual(solution);
    expect(decodeGrid("123")).toBeNull();
    expect(decodeGrid("0".repeat(81))).toBeNull();
  });

  it("valida solo la solución, y a un ritmo humano", () => {
    const { solution, puzzle } = generate("easy", 5);
    const blanks = puzzle.filter((d) => d === 0).length;
    expect(isSolved(solution, solution)).toBe(true);
    expect(verifyRun("easy", 5, encodeGrid(solution), 120_000)).toMatchObject({ valid: true, timeMs: 120_000, filled: blanks });
    const wrong = [...solution];
    [wrong[0], wrong[1]] = [wrong[1]!, wrong[0]!];
    expect(verifyRun("easy", 5, encodeGrid(wrong), 120_000)).toMatchObject({ valid: false });
    expect(verifyRun("easy", 5, encodeGrid(solution), 1_000)).toMatchObject({ valid: false });
  });
});
