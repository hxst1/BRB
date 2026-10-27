/**
 * Puntos y cajas. Una cuadrícula de 5 × 5 puntos (4 × 4 cajas): por turnos,
 * cada jugador traza una raya entre dos puntos vecinos. Quien cierra el cuarto
 * lado de una caja se la queda y vuelve a jugar. Gana quien tenga más cajas.
 *
 * Una partida es su lista de movimientos (la raya de cada jugada) y el estado
 * se deriva repitiéndolos. X siempre mueve primero. Cuando alguien cierra una
 * caja y repite, la propia jugada añade un PASS en el turno del rival: así X
 * juega siempre en las posiciones pares y O en las impares, y la base de datos
 * sabe a quién le toca contando movimientos.
 */

import type { Mark } from "../tictactoe";

export type { Mark };

/** Cajas por lado. */
export const BOXES = 4;
/** Rayas horizontales: BOXES + 1 filas de BOXES. Van primero; luego, las verticales. */
export const HORIZONTAL = (BOXES + 1) * BOXES;
export const EDGES = HORIZONTAL * 2;
/** Turno perdido porque el rival ha cerrado una caja. Lo pone el propio juego, nunca un jugador. */
export const PASS = -1;

export interface DotsState {
  /** Quién trazó cada raya. */
  edges: (Mark | null)[];
  /** De quién es cada caja, en orden de filas. */
  boxes: (Mark | null)[];
  moves: number[];
  /** A quién le toca; null si la partida ha terminado. */
  turn: Mark | null;
  winner: Mark | null;
  draw: boolean;
  score: Record<Mark, number>;
  /** La última raya y las cajas que cerró (para resaltarlas). */
  last: number | null;
  closed: number[];
}

/** Raya horizontal sobre la fila de puntos `row` (0-BOXES), entre las columnas `column` y `column + 1`. */
export const horizontalEdge = (row: number, column: number) => row * BOXES + column;
/** Raya vertical en la columna de puntos `column` (0-BOXES), entre las filas `row` y `row + 1`. */
export const verticalEdge = (row: number, column: number) => HORIZONTAL + row * (BOXES + 1) + column;

/** Las cuatro rayas de una caja: arriba, abajo, izquierda y derecha. */
export function boxEdges(box: number): [number, number, number, number] {
  const row = Math.floor(box / BOXES);
  const column = box % BOXES;
  return [horizontalEdge(row, column), horizontalEdge(row + 1, column), verticalEdge(row, column), verticalEdge(row, column + 1)];
}

/** Las cajas (una o dos) que tienen esta raya como lado. */
export function edgeBoxes(edge: number): number[] {
  if (edge < HORIZONTAL) {
    const row = Math.floor(edge / BOXES);
    const column = edge % BOXES;
    return [row - 1, row].filter((r) => r >= 0 && r < BOXES).map((r) => r * BOXES + column);
  }
  const index = edge - HORIZONTAL;
  const row = Math.floor(index / (BOXES + 1));
  const column = index % (BOXES + 1);
  return [column - 1, column].filter((c) => c >= 0 && c < BOXES).map((c) => row * BOXES + c);
}

export function newGame(): DotsState {
  return {
    edges: Array<Mark | null>(EDGES).fill(null),
    boxes: Array<Mark | null>(BOXES * BOXES).fill(null),
    moves: [],
    turn: "x",
    winner: null,
    draw: false,
    score: { x: 0, o: 0 },
    last: null,
    closed: [],
  };
}

export type MoveError = "game_over" | "not_your_turn" | "invalid_edge" | "taken";

export function play(
  state: DotsState,
  mark: Mark,
  edge: number,
): { ok: true; state: DotsState } | { ok: false; error: MoveError } {
  if (state.turn === null) return { ok: false, error: "game_over" };
  if (state.turn !== mark) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(edge) || edge < 0 || edge >= EDGES) return { ok: false, error: "invalid_edge" };
  if (state.edges[edge] !== null) return { ok: false, error: "taken" };

  const edges = [...state.edges];
  edges[edge] = mark;
  const boxes = [...state.boxes];
  const closed = edgeBoxes(edge).filter((box) => boxEdges(box).every((side) => edges[side] !== null));
  for (const box of closed) boxes[box] = mark;
  const score = { ...state.score, [mark]: state.score[mark] + closed.length };
  const moves = [...state.moves, edge];

  const finished = boxes.every((owner) => owner !== null);
  let turn: Mark | null = mark === "x" ? "o" : "x";
  if (finished) turn = null;
  else if (closed.length > 0) {
    // Ha cerrado una caja: el rival pierde el turno y vuelve a jugar el mismo.
    turn = mark;
    moves.push(PASS);
  }
  const winner = finished && score.x !== score.o ? (score.x > score.o ? "x" : "o") : null;

  return {
    ok: true,
    state: { edges, boxes, moves, turn, winner, draw: finished && !winner, score, last: edge, closed },
  };
}

/**
 * Reconstruye la partida; devuelve null si algún movimiento no es válido.
 * Los PASS los vuelven a poner las jugadas, así que al final la lista tiene
 * que coincidir: un PASS de más o de menos invalida la partida.
 */
export function replay(moves: readonly number[]): DotsState | null {
  let state = newGame();
  for (const edge of moves) {
    if (edge === PASS) continue;
    const result = play(state, state.turn ?? "x", edge);
    if (!result.ok) return null;
    state = result.state;
  }
  return state.moves.length === moves.length && state.moves.every((move, i) => move === moves[i]) ? state : null;
}
