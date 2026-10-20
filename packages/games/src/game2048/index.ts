import { createRng, nextFloat, nextInt, type RngState } from "../rng";

export const SIZE = 4;

export type Direction = "up" | "down" | "left" | "right";

export interface Tile {
  /** Identidad estable entre movimientos, para animar deslizamientos. */
  id: number;
  value: number;
  /** Ids de las dos fichas que se fusionaron en esta (solo en el turno en que ocurre). */
  mergedFrom?: [number, number];
  /** True si la ficha acaba de aparecer en este turno. */
  isNew?: boolean;
}

export interface Game2048State {
  seed: number;
  /** Tablero de SIZE × SIZE en orden de filas; null = casilla vacía. */
  cells: (Tile | null)[];
  score: number;
  /** Movimientos válidos realizados, codificados (ver encodeMoves). */
  moves: string;
  rng: RngState;
  nextTileId: number;
  over: boolean;
}

const MOVE_CODES: Record<Direction, string> = { up: "U", down: "D", left: "L", right: "R" };
const CODE_MOVES: Record<string, Direction> = { U: "up", D: "down", L: "left", R: "right" };

export function encodeMoves(directions: Direction[]): string {
  return directions.map((d) => MOVE_CODES[d]).join("");
}

export function decodeMoves(encoded: string): Direction[] {
  return [...encoded].map((code) => {
    const direction = CODE_MOVES[code];
    if (!direction) throw new Error(`Movimiento desconocido: "${code}"`);
    return direction;
  });
}

export function newGame(seed: number): Game2048State {
  let state: Game2048State = {
    seed,
    cells: Array<Tile | null>(SIZE * SIZE).fill(null),
    score: 0,
    moves: "",
    rng: createRng(seed),
    nextTileId: 1,
    over: false,
  };
  state = spawnTile(state);
  state = spawnTile(state);
  return state;
}

/**
 * Aplica un movimiento. Si no mueve ninguna ficha devuelve el mismo objeto
 * (comparar por referencia para saber si fue válido) y no consume aleatoriedad.
 */
export function move(state: Game2048State, direction: Direction): Game2048State {
  if (state.over) return state;

  // Limpia las marcas de animación del turno anterior.
  const cells = state.cells.map((tile) => (tile ? { id: tile.id, value: tile.value } : null));
  let nextTileId = state.nextTileId;
  let gained = 0;
  let moved = false;

  for (const line of lines(direction)) {
    const tiles = line.map((index) => cells[index]).filter((tile): tile is Tile => tile !== null);
    const result: Tile[] = [];

    for (let i = 0; i < tiles.length; i++) {
      const current = tiles[i]!;
      const following = tiles[i + 1];
      if (following && following.value === current.value) {
        const value = current.value * 2;
        result.push({ id: nextTileId++, value, mergedFrom: [current.id, following.id] });
        gained += value;
        i++;
      } else {
        result.push(current);
      }
    }

    line.forEach((index, position) => {
      const tile = result[position] ?? null;
      if (cells[index]?.id !== tile?.id) moved = true;
      cells[index] = tile;
    });
  }

  if (!moved) return state;

  let next: Game2048State = {
    ...state,
    cells,
    score: state.score + gained,
    moves: state.moves + MOVE_CODES[direction],
    nextTileId,
  };
  next = spawnTile(next);
  return { ...next, over: !canMove(next.cells) };
}

/**
 * Reconstruye una partida a partir de su semilla y movimientos. Es lo que
 * ejecuta el servidor para validar una puntuación: si algún movimiento no
 * cambia el tablero la partida se considera manipulada.
 */
export function replay(
  seed: number,
  encodedMoves: string,
): { valid: true; state: Game2048State } | { valid: false; reason: string } {
  let directions: Direction[];
  try {
    directions = decodeMoves(encodedMoves);
  } catch (error) {
    return { valid: false, reason: (error as Error).message };
  }

  let state = newGame(seed);
  for (const [index, direction] of directions.entries()) {
    const next = move(state, direction);
    if (next === state) {
      return { valid: false, reason: `El movimiento ${index + 1} (${direction}) no es válido` };
    }
    state = next;
  }
  return { valid: true, state };
}

export function maxTile(state: Game2048State): number {
  return state.cells.reduce((max, tile) => Math.max(max, tile?.value ?? 0), 0);
}

function spawnTile(state: Game2048State): Game2048State {
  const empty = state.cells.flatMap((tile, index) => (tile ? [] : [index]));
  if (empty.length === 0) return state;

  const [slot, afterSlot] = nextInt(state.rng, empty.length);
  const [roll, afterRoll] = nextFloat(afterSlot);
  const cells = [...state.cells];
  cells[empty[slot]!] = { id: state.nextTileId, value: roll < 0.9 ? 2 : 4, isNew: true };

  return { ...state, cells, rng: afterRoll, nextTileId: state.nextTileId + 1 };
}

function canMove(cells: (Tile | null)[]): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const tile = cells[row * SIZE + col];
      if (!tile) return true;
      const right = col + 1 < SIZE ? cells[row * SIZE + col + 1] : null;
      const below = row + 1 < SIZE ? cells[(row + 1) * SIZE + col] : null;
      if (right?.value === tile.value || below?.value === tile.value) return true;
    }
  }
  return false;
}

/** Índices de cada fila/columna, ordenados desde el borde hacia el que se desliza. */
function lines(direction: Direction): number[][] {
  const result: number[][] = [];
  for (let a = 0; a < SIZE; a++) {
    const line: number[] = [];
    for (let b = 0; b < SIZE; b++) {
      const offset = direction === "left" || direction === "up" ? b : SIZE - 1 - b;
      line.push(direction === "left" || direction === "right" ? a * SIZE + offset : offset * SIZE + a);
    }
    result.push(line);
  }
  return result;
}
