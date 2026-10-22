import { createRng, nextInt, type RngState } from "../rng";

/**
 * Sudoku. Cada partida sale de la semilla: primero un tablero resuelto al
 * azar y luego se quitan números (en orden aleatorio) mientras la solución
 * siga siendo única, hasta dejar las pistas de la dificultad. Como la
 * solución es única, el servidor solo tiene que regenerarlo y comparar.
 *
 * Los tableros son listas de 81 números en orden de filas; 0 es vacío.
 */

export type Difficulty = "easy" | "medium" | "hard";

/** Pistas que quedan a la vista (como mucho; si quitar más rompe la unicidad, quedan algunas más). */
export const CLUES: Record<Difficulty, number> = { easy: 40, medium: 32, hard: 26 };

/** Nombre del juego en `game_runs` para cada dificultad (cada una tiene su ranking). */
export const GAME_IDS: Record<Difficulty, string> = {
  easy: "sudoku-easy",
  medium: "sudoku-medium",
  hard: "sudoku-hard",
};

export const row = (cell: number) => Math.floor(cell / 9);
export const col = (cell: number) => cell % 9;
export const box = (cell: number) => Math.floor(row(cell) / 3) * 3 + Math.floor(col(cell) / 3);

/** Casillas que comparten fila, columna o caja con `cell` (sin ella). */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, cell) =>
  Array.from({ length: 81 }, (_, other) => other).filter(
    (other) => other !== cell && (row(other) === row(cell) || col(other) === col(cell) || box(other) === box(cell)),
  ),
);

/** Números posibles en una casilla, como máscara de bits (bit n = el número n). */
function candidates(grid: number[], cell: number): number {
  let used = 0;
  for (const peer of PEERS[cell]!) used |= 1 << grid[peer]!;
  return ~used & 0b1111111110;
}

/**
 * Cuenta soluciones hasta `limit` (rellena `grid` con la primera si se pide).
 * Elige siempre la casilla con menos candidatos: rápido incluso en los difíciles.
 */
function countSolutions(grid: number[], limit: number, order?: () => number[]): number {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell] !== 0) continue;
    const mask = candidates(grid, cell);
    const count = popcount(mask);
    if (count < bestCount) {
      best = cell;
      bestMask = mask;
      bestCount = count;
      if (count <= 1) break;
    }
  }
  if (best === -1) return 1;
  if (bestCount === 0) return 0;

  let found = 0;
  const digits = order ? order() : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const digit of digits) {
    if (!(bestMask & (1 << digit))) continue;
    grid[best] = digit;
    found += countSolutions(grid, limit - found, order);
    if (found >= limit) {
      // Con `order` se está generando: se deja el tablero relleno.
      if (!order) grid[best] = 0;
      return found;
    }
  }
  grid[best] = 0;
  return found;
}

function popcount(mask: number): number {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

function shuffle<T>(items: T[], rng: RngState): [T[], RngState] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1);
    rng = next;
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return [list, rng];
}

export interface Puzzle {
  difficulty: Difficulty;
  /** Tablero inicial: las pistas y 0 en las casillas que hay que rellenar. */
  puzzle: number[];
  solution: number[];
}

export function generate(difficulty: Difficulty, seed: number): Puzzle {
  let rng = createRng(seed);

  // Tablero resuelto al azar: el solucionador prueba los números en un orden aleatorio.
  const solution = Array<number>(81).fill(0);
  countSolutions(solution, 1, () => {
    const [digits, next] = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    rng = next;
    return digits;
  });

  // Quitar números en orden aleatorio mientras la solución siga siendo única.
  const puzzle = [...solution];
  const [order, next] = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  rng = next;
  let clues = 81;
  for (const cell of order) {
    if (clues <= CLUES[difficulty]) break;
    const digit = puzzle[cell]!;
    puzzle[cell] = 0;
    if (countSolutions([...puzzle], 2) === 1) clues--;
    else puzzle[cell] = digit;
  }
  return { difficulty, puzzle, solution };
}

/** Casillas que chocan con otra (mismo número en su fila, columna o caja). */
export function conflicts(grid: readonly number[]): Set<number> {
  const bad = new Set<number>();
  for (let cell = 0; cell < 81; cell++) {
    const digit = grid[cell];
    if (!digit) continue;
    for (const peer of PEERS[cell]!) if (grid[peer] === digit) bad.add(cell);
  }
  return bad;
}

export function isSolved(grid: readonly number[], solution: readonly number[]): boolean {
  return grid.every((digit, i) => digit === solution[i]);
}

/** 81 cifras seguidas: lo que se envía al servidor al terminar. */
export function encodeGrid(grid: readonly number[]): string {
  return grid.join("");
}

export function decodeGrid(encoded: string): number[] | null {
  return /^[1-9]{81}$/.test(encoded) ? [...encoded].map(Number) : null;
}
