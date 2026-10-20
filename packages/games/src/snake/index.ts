import { createRng, nextInt, type RngState } from "../rng";

/**
 * Snake por tics. Cada tic la serpiente avanza una casilla; los giros se
 * aplican al principio de un tic. La partida queda registrada como la lista
 * de giros con el tic en que se aplicaron, así que se puede repetir entera a
 * partir de la semilla (la comida sale del rng) y validar en el servidor.
 */

export const GRID = 15;
export const POINTS_PER_APPLE = 10;

export type Direction = "up" | "down" | "left" | "right";

export interface SnakeState {
  seed: number;
  rng: RngState;
  /** Casillas que ocupa (índice fila * GRID + columna), de la cabeza a la cola. */
  body: number[];
  direction: Direction;
  /** Casilla de la manzana, o null si la serpiente llena el tablero. */
  food: number | null;
  /** Tics jugados. */
  tick: number;
  apples: number;
  score: number;
  /** Giros aplicados, codificados (ver encodeTurns). */
  turns: string;
  /** Tic del último giro (para codificar el siguiente como diferencia). */
  lastTurnTick: number;
  over: boolean;
}

const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
const CODES: Record<Direction, string> = { up: "U", down: "D", left: "L", right: "R" };
const FROM_CODE: Record<string, Direction> = { U: "up", D: "down", L: "left", R: "right" };

/** Duración de un tic: empieza tranquilo y acelera con cada manzana hasta un tope. */
export function tickMs(apples: number): number {
  return Math.max(70, 150 - apples * 3);
}

export function newGame(seed: number): SnakeState {
  const row = Math.floor(GRID / 2);
  const head = row * GRID + 4;
  const state: SnakeState = {
    seed,
    rng: createRng(seed),
    body: [head, head - 1, head - 2],
    direction: "right",
    food: null,
    tick: 0,
    apples: 0,
    score: 0,
    turns: "",
    lastTurnTick: 0,
    over: false,
  };
  return placeFood(state);
}

/** ¿Se puede girar hacia ahí? Ni hacia atrás ni en la misma dirección. */
export function canTurn(state: SnakeState, direction: Direction): boolean {
  return direction !== state.direction && direction !== OPPOSITE[state.direction];
}

/** Avanza un tic, girando antes si se indica (y el giro es válido). */
export function step(state: SnakeState, turn?: Direction): SnakeState {
  if (state.over) return state;

  const tick = state.tick + 1;
  let { direction, turns, lastTurnTick } = state;
  if (turn && canTurn(state, turn)) {
    direction = turn;
    turns += `${tick - lastTurnTick}${CODES[turn]}`;
    lastTurnTick = tick;
  }

  const head = state.body[0]!;
  const row = Math.floor(head / GRID);
  const col = head % GRID;
  const [nextRow, nextCol] =
    direction === "up" ? [row - 1, col] : direction === "down" ? [row + 1, col] : direction === "left" ? [row, col - 1] : [row, col + 1];

  const base = { ...state, tick, direction, turns, lastTurnTick };
  if (nextRow < 0 || nextRow >= GRID || nextCol < 0 || nextCol >= GRID) return { ...base, over: true };

  const nextHead = nextRow * GRID + nextCol;
  const eats = nextHead === state.food;
  // La cola deja su casilla en este mismo tic, salvo si la serpiente crece.
  const body = eats ? state.body : state.body.slice(0, -1);
  if (body.includes(nextHead)) return { ...base, over: true };

  const next: SnakeState = { ...base, body: [nextHead, ...body] };
  if (!eats) return next;

  const apples = state.apples + 1;
  return placeFood({ ...next, apples, score: apples * POINTS_PER_APPLE });
}

/** Pone la manzana en una casilla libre al azar; si no queda ninguna, la partida acaba (ganada). */
function placeFood(state: SnakeState): SnakeState {
  const occupied = new Set(state.body);
  const free: number[] = [];
  for (let cell = 0; cell < GRID * GRID; cell++) if (!occupied.has(cell)) free.push(cell);
  if (free.length === 0) return { ...state, food: null, over: true };
  const [index, rng] = nextInt(state.rng, free.length);
  return { ...state, food: free[index]!, rng };
}

export type Turn = { tick: number; direction: Direction };

/** "3R12U": tics desde el giro anterior y dirección. */
export function decodeTurns(encoded: string): Turn[] | null {
  const turns: Turn[] = [];
  let tick = 0;
  for (const [, delta, code] of encoded.matchAll(/(\d+)([UDLR])/g)) {
    const gap = Number(delta);
    if (!Number.isSafeInteger(gap) || gap < 1) return null;
    tick += gap;
    turns.push({ tick, direction: FROM_CODE[code!]! });
  }
  // Todo el texto tiene que ser giros válidos.
  return turns.map((t, i) => `${t.tick - (turns[i - 1]?.tick ?? 0)}${CODES[t.direction]}`).join("") === encoded ? turns : null;
}

export type ReplayResult = { valid: true; state: SnakeState; durationMs: number } | { valid: false; reason: string };

/** Límite de seguridad: ninguna partida real llega a tantos tics. */
const MAX_TICKS = 500_000;

/**
 * Repite una partida desde la semilla aplicando los giros y deja avanzar a la
 * serpiente hasta que choca. Devuelve también el tiempo mínimo que dura
 * (suma de los tics), para comprobar que no se ha jugado más rápido de lo posible.
 */
export function replay(seed: number, encoded: string): ReplayResult {
  const turns = decodeTurns(encoded);
  if (!turns) return { valid: false, reason: "Giros mal codificados" };

  let state = newGame(seed);
  let durationMs = 0;
  let next = 0;
  while (!state.over) {
    if (state.tick >= MAX_TICKS) return { valid: false, reason: "Partida demasiado larga" };
    const turn = turns[next];
    const applies = turn?.tick === state.tick + 1;
    if (applies && !canTurn(state, turn.direction)) return { valid: false, reason: `Giro imposible en el tic ${turn.tick}` };
    durationMs += tickMs(state.apples);
    state = step(state, applies ? turn.direction : undefined);
    if (applies) next++;
  }
  if (next < turns.length) return { valid: false, reason: "Giros después de chocar" };
  return { valid: true, state, durationMs };
}
