/**
 * Tron: dos motos que dejan estela en un tablero de GRID × GRID. Avanzan una
 * casilla por tic; chocar con un borde o con cualquier estela elimina. Si
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

export interface Rider {
  /** Casilla de la cabeza (fila × GRID + columna). */
  head: number;
  direction: Direction;
  alive: boolean;
}

export interface TronState {
  round: number;
  tick: number;
  riders: Record<Mark, Rider>;
  /** Dueño de cada casilla con estela: 0 vacía, 1 X, 2 O. */
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
      x: { head: START.x.cell, direction: START.x.direction, alive: true },
      o: { head: START.o.cell, direction: START.o.direction, alive: true },
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

  const riders = { x: { ...state.riders.x }, o: { ...state.riders.o } };
  for (const mark of ["x", "o"] as const) {
    const turn = turns[mark];
    if (turn && canTurn(riders[mark], turn)) riders[mark].direction = turn;
  }

  const next = { x: neighbor(riders.x.head, riders.x.direction), o: neighbor(riders.o.head, riders.o.direction) };
  const crash = (mark: Mark) => next[mark] < 0 || state.trails[next[mark]] !== 0;
  const crashed = { x: crash("x"), o: crash("o") };
  // Chocan de frente en la misma casilla: caen los dos.
  if (next.x >= 0 && next.x === next.o) crashed.x = crashed.o = true;

  const trails = state.trails.slice();
  for (const mark of ["x", "o"] as const) {
    if (crashed[mark]) {
      riders[mark].alive = false;
    } else {
      riders[mark].head = next[mark];
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

/** Dueño de una casilla de estela (para dibujar). */
export function ownerOf(trails: Uint8Array, cell: number): Mark | null {
  return trails[cell] === OWNER.x ? "x" : trails[cell] === OWNER.o ? "o" : null;
}

/** Marca una casilla de estela (el invitado rehace las estelas con lo que le llega). */
export function paint(trails: Uint8Array, cell: number, mark: Mark): void {
  trails[cell] = OWNER[mark];
}
