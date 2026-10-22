import { createRng, nextInt } from "../rng";

/**
 * Buscaminas. Las minas se colocan desde la semilla al abrir la primera
 * casilla, dejando libres esa casilla y sus vecinas (el primer toque siempre
 * abre una zona). Una partida es la lista de casillas abiertas a mano, así
 * que el servidor la puede repetir para comprobar que se ha despejado todo
 * sin pisar ninguna mina. Las banderas solo son una ayuda: no cuentan.
 */

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Record<Difficulty, { columns: number; rows: number; mines: number }> = {
  easy: { columns: 9, rows: 9, mines: 10 },
  medium: { columns: 16, rows: 16, mines: 40 },
  // Vertical para que quepa en el móvil.
  hard: { columns: 16, rows: 30, mines: 99 },
};

/** Nombre del juego en `game_runs` para cada dificultad (cada una tiene su ranking). */
export const GAME_IDS: Record<Difficulty, string> = {
  easy: "minesweeper-easy",
  medium: "minesweeper-medium",
  hard: "minesweeper-hard",
};

export interface MinesweeperState {
  difficulty: Difficulty;
  columns: number;
  rows: number;
  seed: number;
  /** null hasta la primera casilla abierta (entonces se colocan). */
  mines: Set<number> | null;
  /** Minas alrededor de cada casilla. */
  counts: number[];
  revealed: Set<number>;
  /** Casillas abiertas a mano, en orden: es lo que se envía al servidor. */
  opened: number[];
  status: "playing" | "won" | "lost";
  /** Mina que se pisó, si se perdió. */
  exploded: number | null;
}

export function newGame(difficulty: Difficulty, seed: number): MinesweeperState {
  const { columns, rows } = DIFFICULTIES[difficulty];
  return {
    difficulty,
    columns,
    rows,
    seed,
    mines: null,
    counts: Array(columns * rows).fill(0),
    revealed: new Set(),
    opened: [],
    status: "playing",
    exploded: null,
  };
}

export function neighbors(cell: number, columns: number, rows: number): number[] {
  const row = Math.floor(cell / columns);
  const col = cell % columns;
  const list: number[] = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if ((r !== row || c !== col) && r >= 0 && r < rows && c >= 0 && c < columns) list.push(r * columns + c);
    }
  }
  return list;
}

/** Coloca las minas al azar (desde la semilla) evitando la primera casilla y sus vecinas. */
function placeMines(state: MinesweeperState, first: number): Pick<MinesweeperState, "mines" | "counts"> {
  const { columns, rows } = state;
  const { mines: total } = DIFFICULTIES[state.difficulty];
  const safe = new Set([first, ...neighbors(first, columns, rows)]);
  const pool = Array.from({ length: columns * rows }, (_, i) => i).filter((cell) => !safe.has(cell));
  let rng = createRng(state.seed);
  // Fisher-Yates parcial: las `total` primeras posiciones son las minas.
  for (let i = 0; i < total; i++) {
    const [offset, next] = nextInt(rng, pool.length - i);
    rng = next;
    const j = i + offset;
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const mines = new Set(pool.slice(0, total));
  const counts = Array.from({ length: columns * rows }, (_, cell) =>
    neighbors(cell, columns, rows).filter((n) => mines.has(n)).length,
  );
  return { mines, counts };
}

/** Abre una casilla. Si no tiene minas alrededor, abre también toda la zona. */
export function reveal(state: MinesweeperState, cell: number): MinesweeperState {
  if (state.status !== "playing" || cell < 0 || cell >= state.columns * state.rows || state.revealed.has(cell)) return state;

  const placed = state.mines ? { mines: state.mines, counts: state.counts } : placeMines(state, cell);
  const opened = [...state.opened, cell];
  if (placed.mines!.has(cell)) {
    return { ...state, ...placed, opened, status: "lost", exploded: cell };
  }

  const revealed = new Set(state.revealed);
  const queue = [cell];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (revealed.has(current)) continue;
    revealed.add(current);
    if (placed.counts[current] === 0) {
      for (const n of neighbors(current, state.columns, state.rows)) if (!revealed.has(n)) queue.push(n);
    }
  }

  const safeCells = state.columns * state.rows - DIFFICULTIES[state.difficulty].mines;
  return { ...state, ...placed, revealed, opened, status: revealed.size === safeCells ? "won" : "playing" };
}

/**
 * Pulsar un número ya abierto con tantas banderas alrededor como su número:
 * abre el resto de vecinas (si alguna bandera estaba mal, se pisa la mina).
 */
export function chord(state: MinesweeperState, cell: number, flags: ReadonlySet<number>): MinesweeperState {
  if (state.status !== "playing" || !state.revealed.has(cell)) return state;
  const around = neighbors(cell, state.columns, state.rows);
  if (around.filter((n) => flags.has(n)).length !== state.counts[cell]) return state;
  let next = state;
  for (const n of around) if (!flags.has(n) && !next.revealed.has(n)) next = reveal(next, n);
  return next;
}

export function encodeOpened(opened: readonly number[]): string {
  return opened.join(",");
}

export type ReplayResult = { valid: true; state: MinesweeperState } | { valid: false; reason: string };

/** Repite una partida: tiene que acabar despejada, sin pisar minas ni abrir casillas de más. */
export function replay(difficulty: Difficulty, seed: number, encoded: string): ReplayResult {
  if (!/^\d+(,\d+)*$/.test(encoded)) return { valid: false, reason: "Casillas mal codificadas" };
  let state = newGame(difficulty, seed);
  for (const cell of encoded.split(",").map(Number)) {
    if (state.status !== "playing") return { valid: false, reason: "Casillas después de terminar" };
    if (cell >= state.columns * state.rows) return { valid: false, reason: `Casilla fuera del tablero: ${cell}` };
    state = reveal(state, cell);
  }
  if (state.status !== "won") return { valid: false, reason: state.status === "lost" ? "Ha pisado una mina" : "No está despejado" };
  return { valid: true, state };
}
