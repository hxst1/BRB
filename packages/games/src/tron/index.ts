/**
 * Tron: dos motos que dejan estela en un tablero de GRID × GRID. Avanzan una
 * casilla por tic y la estela solo dura TRAIL_LENGTH casillas: lo más antiguo
 * se va borrando. Chocar con un borde o con cualquier estela elimina. Si
 * caen los dos a la vez, la ronda se repite. Gana la partida quien llega
 * antes a WIN_ROUNDS rondas.
 *
 * Se juega en directo: X hace de anfitrión, simula con este motor y
 * retransmite; O solo manda sus giros (como en el pong).
 */

export type Mark = "x" | "o";
export type Direction = "up" | "down" | "left" | "right";

export const GRID = 40;
/** Duración de un tic: ~16 casillas por segundo. */
export const TICK_MS = 60;
export const WIN_ROUNDS = 3;
/** Pausa entre rondas (y antes de la primera), en ms. */
export const ROUND_PAUSE_MS = 1500;
/** Casillas que dura la estela de cada moto (algo más de un segundo y medio). */
export const TRAIL_LENGTH = 24;

export interface Rider {
  /** Casilla de la cabeza (fila × GRID + columna). */
  head: number;
  direction: Direction;
  alive: boolean;
  /** Estela de la más antigua a la cabeza (incluida). */
  trail: number[];
}

export interface TronState {
  round: number;
  tick: number;
  riders: Record<Mark, Rider>;
  /** Casillas ocupadas por alguna estela (para los choques): 0 libre, 1 X, 2 O. */
  trails: Uint8Array;
  score: Record<Mark, number>;
  /** Resultado de la ronda en curso cuando acaba; null mientras se juega. */
  roundOver: Mark | "draw" | null;
  /** Ganador de la partida. */
  winner: Mark | null;
  /** Milisegundos de pausa antes de que se mueva nada. */
  pause: number;
}

const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
const OWNER: Record<Mark, number> = { x: 1, o: 2 };

export const START: Record<Mark, { cell: number; direction: Direction }> = {
  x: { cell: Math.floor(GRID / 2) * GRID + 6, direction: "right" },
  o: { cell: (Math.floor(GRID / 2) - 1) * GRID + GRID - 7, direction: "left" },
};

function startRound(score: Record<Mark, number>, round: number): TronState {
  const trails = new Uint8Array(GRID * GRID);
  trails[START.x.cell] = OWNER.x;
  trails[START.o.cell] = OWNER.o;
  return {
    round,
    tick: 0,
    riders: {
      x: { head: START.x.cell, direction: START.x.direction, alive: true, trail: [START.x.cell] },
      o: { head: START.o.cell, direction: START.o.direction, alive: true, trail: [START.o.cell] },
    },
    trails,
    score,
    roundOver: null,
    winner: null,
    pause: ROUND_PAUSE_MS,
  };
}

export function newGame(): TronState {
  return startRound({ x: 0, o: 0 }, 1);
}

/** Siguiente casilla en una dirección, o -1 si se sale del tablero. */
export function neighbor(cell: number, direction: Direction): number {
  const row = Math.floor(cell / GRID);
  const col = cell % GRID;
  if (direction === "up") return row > 0 ? cell - GRID : -1;
  if (direction === "down") return row < GRID - 1 ? cell + GRID : -1;
  if (direction === "left") return col > 0 ? cell - 1 : -1;
  return col < GRID - 1 ? cell + 1 : -1;
}

/** Un giro vale si no es hacia atrás. */
export function canTurn(rider: Rider, direction: Direction): boolean {
  return direction !== OPPOSITE[rider.direction];
}

/**
 * Avanza un tic con los giros de cada jugador (si los hay). Al acabar una
 * ronda, el siguiente tic tras la pausa empieza la otra.
 */
export function step(state: TronState, turns: Partial<Record<Mark, Direction>> = {}): TronState {
  if (state.winner) return state;
  if (state.roundOver) return startRound(state.score, state.round + 1);

  const riders = {
    x: { ...state.riders.x, trail: [...state.riders.x.trail] },
    o: { ...state.riders.o, trail: [...state.riders.o.trail] },
  };
  for (const mark of ["x", "o"] as const) {
    const turn = turns[mark];
    if (turn && canTurn(riders[mark], turn)) riders[mark].direction = turn;
  }

  // Primero se borra el final de las estelas que ya han llegado a su largo:
  // esa casilla queda libre en este mismo tic.
  const trails = state.trails.slice();
  for (const mark of ["x", "o"] as const) {
    if (riders[mark].trail.length >= TRAIL_LENGTH) trails[riders[mark].trail.shift()!] = 0;
  }

  const next = { x: neighbor(riders.x.head, riders.x.direction), o: neighbor(riders.o.head, riders.o.direction) };
  const crash = (mark: Mark) => next[mark] < 0 || trails[next[mark]] !== 0;
  const crashed = { x: crash("x"), o: crash("o") };
  // Chocan de frente en la misma casilla: caen los dos.
  if (next.x >= 0 && next.x === next.o) crashed.x = crashed.o = true;

  for (const mark of ["x", "o"] as const) {
    if (crashed[mark]) {
      riders[mark].alive = false;
    } else {
      riders[mark].head = next[mark];
      riders[mark].trail.push(next[mark]);
      trails[next[mark]] = OWNER[mark];
    }
  }

  let roundOver: TronState["roundOver"] = null;
  const score = { ...state.score };
  if (crashed.x && crashed.o) roundOver = "draw";
  else if (crashed.x) roundOver = "o";
  else if (crashed.o) roundOver = "x";
  if (roundOver === "x" || roundOver === "o") score[roundOver]++;
  const winner = score.x >= WIN_ROUNDS ? "x" : score.o >= WIN_ROUNDS ? "o" : null;

  return {
    ...state,
    tick: state.tick + 1,
    riders,
    trails,
    score,
    roundOver,
    winner,
    pause: roundOver && !winner ? ROUND_PAUSE_MS : 0,
  };
}

/** Dueño de una casilla de estela. */
export function ownerOf(trails: Uint8Array, cell: number): Mark | null {
  return trails[cell] === OWNER.x ? "x" : trails[cell] === OWNER.o ? "o" : null;
}

/** Rehace las casillas ocupadas a partir de las estelas (el invitado solo recibe las estelas). */
export function occupancy(riders: Record<Mark, Rider>): Uint8Array {
  const trails = new Uint8Array(GRID * GRID);
  for (const mark of ["x", "o"] as const) for (const cell of riders[mark].trail) trails[cell] = OWNER[mark];
  return trails;
}
