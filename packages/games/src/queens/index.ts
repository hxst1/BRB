import { createRng, nextInt, type RngState } from "../rng";

/**
 * Reinas (las reglas del Queens de LinkedIn). Un tablero N × N partido en N
 * regiones de colores: hay que poner N reinas, una por fila, una por columna
 * y una por región, sin que dos se toquen (tampoco en diagonal).
 *
 * Cada tablero sale de la semilla: primero la solución (N reinas que no se
 * tocan), luego las regiones, que crecen al azar desde cada reina hasta
 * cubrir el tablero. Mientras haya otra solución, una de sus casillas pasa a
 * una región vecina (y esa solución deja de valer), hasta que queda solo la
 * buena; así el servidor solo tiene que regenerarlo y comparar.
 *
 * Las casillas se numeran por filas: casilla = fila * N + columna.
 */

export type Difficulty = "easy" | "medium" | "hard";

/** Lado del tablero (y número de reinas y de regiones). */
export const SIZES: Record<Difficulty, number> = { easy: 7, medium: 8, hard: 9 };

/** Nombre del juego en `game_runs` para cada dificultad (cada una tiene su ranking). */
export const GAME_IDS: Record<Difficulty, string> = {
  easy: "queens-easy",
  medium: "queens-medium",
  hard: "queens-hard",
};

export interface Puzzle {
  size: number;
  /** Región de cada casilla (de 0 a N − 1). */
  regions: number[];
  /** Columna de la reina de cada fila. */
  solution: number[];
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

/** Una reina por fila y columna, sin que se toquen: basta con que las de filas seguidas disten 2 columnas o más. */
function randomQueens(size: number, rng: RngState): [number[], RngState] {
  const columns: number[] = [];
  const used = new Set<number>();
  const place = (row: number): boolean => {
    if (row === size) return true;
    const [order, next] = shuffle(
      Array.from({ length: size }, (_, c) => c),
      rng,
    );
    rng = next;
    for (const column of order) {
      if (used.has(column) || (row > 0 && Math.abs(columns[row - 1]! - column) < 2)) continue;
      columns.push(column);
      used.add(column);
      if (place(row + 1)) return true;
      columns.pop();
      used.delete(column);
    }
    return false;
  };
  place(0);
  return [columns, rng];
}

/** Regiones que crecen al azar desde la casilla de cada reina, de una casilla vecina cada vez. */
function growRegions(size: number, queens: number[], rng: RngState): [number[], RngState] {
  const regions = Array<number>(size * size).fill(-1);
  queens.forEach((column, row) => (regions[row * size + column] = row));
  let left = size * size - size;
  while (left > 0) {
    // Una casilla libre al azar que toque alguna región; se une a una de ellas al azar.
    const [start, next] = nextInt(rng, size * size);
    rng = next;
    for (let k = 0; k < size * size; k++) {
      const cell = (start + k) % (size * size);
      if (regions[cell] !== -1) continue;
      const around = neighbours(size, cell)
        .map((other) => regions[other]!)
        .filter((region) => region !== -1);
      if (around.length === 0) continue;
      const [pick, after] = nextInt(rng, around.length);
      rng = after;
      regions[cell] = around[pick]!;
      left--;
      break;
    }
  }
  return [regions, rng];
}

/** Vecinas en horizontal y vertical. */
function neighbours(size: number, cell: number): number[] {
  const row = Math.floor(cell / size);
  const column = cell % size;
  const result: number[] = [];
  if (row > 0) result.push(cell - size);
  if (row < size - 1) result.push(cell + size);
  if (column > 0) result.push(cell - 1);
  if (column < size - 1) result.push(cell + 1);
  return result;
}

/** Hasta `limit` soluciones (la columna de la reina de cada fila), fila a fila. */
export function solutions(size: number, regions: readonly number[], limit = 2): number[][] {
  const usedColumns = new Set<number>();
  const usedRegions = new Set<number>();
  const columns: number[] = [];
  const found: number[][] = [];
  const place = (row: number) => {
    if (row === size) {
      found.push([...columns]);
      return;
    }
    for (let column = 0; column < size && found.length < limit; column++) {
      const region = regions[row * size + column]!;
      if (usedColumns.has(column) || usedRegions.has(region) || (row > 0 && Math.abs(columns[row - 1]! - column) < 2)) continue;
      usedColumns.add(column);
      usedRegions.add(region);
      columns.push(column);
      place(row + 1);
      columns.pop();
      usedColumns.delete(column);
      usedRegions.delete(region);
    }
  };
  place(0);
  return found;
}

/** Sin `cell`, ¿la región sigue de una pieza? */
function connectedWithout(size: number, regions: readonly number[], cell: number): boolean {
  const region = regions[cell]!;
  const cells = regions.flatMap((r, i) => (r === region && i !== cell ? [i] : []));
  if (cells.length === 0) return false;
  const seen = new Set([cells[0]!]);
  const queue = [cells[0]!];
  while (queue.length > 0) {
    for (const other of neighbours(size, queue.pop()!)) {
      if (other !== cell && regions[other] === region && !seen.has(other)) {
        seen.add(other);
        queue.push(other);
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Quita una solución que no es la buena: una casilla donde esa pone reina (y
 * la buena no) pasa a una región vecina. Devuelve false si no hay ninguna que
 * se pueda pasar sin partir su región.
 */
function breakSolution(size: number, regions: number[], queens: number[], other: number[], rng: RngState): [boolean, RngState] {
  const [rows, next] = shuffle(
    Array.from({ length: size }, (_, row) => row),
    rng,
  );
  rng = next;
  for (const row of rows) {
    // Donde coinciden, es una reina de la buena: esa no se toca.
    if (other[row] === queens[row]) continue;
    const cell = row * size + other[row]!;
    const targets = [...new Set(neighbours(size, cell).map((n) => regions[n]!))].filter((r) => r !== regions[cell]);
    if (targets.length === 0 || !connectedWithout(size, regions, cell)) continue;
    const [pick, after] = nextInt(rng, targets.length);
    regions[cell] = targets[pick]!;
    return [true, after];
  }
  return [false, rng];
}

/** Retoques como mucho antes de volver a empezar con otras regiones. */
const MAX_REPAIRS = 60;

export function generate(difficulty: Difficulty, seed: number): Puzzle {
  const size = SIZES[difficulty];
  let rng = createRng(seed);
  for (;;) {
    let queens: number[];
    let regions: number[];
    [queens, rng] = randomQueens(size, rng);
    [regions, rng] = growRegions(size, queens, rng);
    for (let repair = 0; repair < MAX_REPAIRS; repair++) {
      const found = solutions(size, regions);
      if (found.length === 1) return { size, regions, solution: queens };
      const other = found.find((columns) => columns.some((column, row) => column !== queens[row]))!;
      let fixed: boolean;
      [fixed, rng] = breakSolution(size, regions, queens, other, rng);
      if (!fixed) break;
    }
  }
}

/**
 * Reinas que incumplen alguna regla (misma fila, columna o región que otra,
 * o tocándose): se marcan en rojo.
 */
export function conflicts(size: number, regions: readonly number[], queens: ReadonlySet<number>): Set<number> {
  const bad = new Set<number>();
  const list = [...queens];
  for (const a of list) {
    for (const b of list) {
      if (a >= b) continue;
      const [ra, ca, rb, cb] = [Math.floor(a / size), a % size, Math.floor(b / size), b % size];
      const touching = Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1;
      if (ra === rb || ca === cb || regions[a] === regions[b] || touching) {
        bad.add(a);
        bad.add(b);
      }
    }
  }
  return bad;
}

/** Está resuelto: N reinas y ninguna incumple nada (como la solución es única, es esa). */
export function isSolved(puzzle: Puzzle, queens: ReadonlySet<number>): boolean {
  return queens.size === puzzle.size && conflicts(puzzle.size, puzzle.regions, queens).size === 0;
}

/** Las reinas como lo que se envía al servidor: la columna de cada fila, en cifras seguidas. */
export function encodeQueens(size: number, queens: ReadonlySet<number>): string {
  const columns = Array<number>(size).fill(-1);
  for (const cell of queens) columns[Math.floor(cell / size)] = cell % size;
  return columns.join("");
}

export function decodeQueens(size: number, encoded: string): number[] | null {
  if (!new RegExp(`^[0-${size - 1}]{${size}}$`).test(encoded)) return null;
  return [...encoded].map(Number);
}
