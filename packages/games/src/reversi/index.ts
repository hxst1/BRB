/**
 * Reversi (Othello). Tablero de 8 × 8; cada jugada pone una ficha que encierra
 * en línea recta fichas del rival, y esas fichas cambian de color. Una partida
 * es su lista de movimientos (la casilla de cada jugada, 0-63) y el estado se
 * deriva repitiéndolos. X siempre mueve primero.
 *
 * Si quien tiene el turno no puede mover, pasa: la propia jugada anterior
 * añade un PASS en su lugar. Así X juega siempre en las posiciones pares y O
 * en las impares, y la base de datos sabe a quién le toca contando movimientos.
 */

import type { Mark } from "../tictactoe";

export type { Mark };
export type Cell = Mark | null;

export const SIZE = 8;
/** Turno perdido por no tener jugada. Lo pone el propio juego, nunca un jugador. */
export const PASS = -1;

export interface ReversiState {
  /** Casillas en orden de filas, de arriba a abajo. */
  board: Cell[];
  moves: number[];
  /** A quién le toca; null si la partida ha terminado. */
  turn: Mark | null;
  winner: Mark | null;
  draw: boolean;
  score: Record<Mark, number>;
  /** La última ficha puesta y las que dio la vuelta (para animarlas). */
  last: number | null;
  flipped: number[];
  /** Quién se quedó sin jugada tras el último movimiento, si alguien. */
  passed: Mark | null;
}

const other = (mark: Mark): Mark => (mark === "x" ? "o" : "x");

export function newGame(): ReversiState {
  const board = Array<Cell>(SIZE * SIZE).fill(null);
  board[3 * SIZE + 3] = "o";
  board[3 * SIZE + 4] = "x";
  board[4 * SIZE + 3] = "x";
  board[4 * SIZE + 4] = "o";
  return { board, moves: [], turn: "x", winner: null, draw: false, score: { x: 2, o: 2 }, last: null, flipped: [], passed: null };
}

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

/** Las fichas del rival que daría la vuelta poner `mark` en `cell` (vacío si no es jugada válida). */
export function flipsFor(board: readonly Cell[], mark: Mark, cell: number): number[] {
  if (board[cell] !== null) return [];
  const row = Math.floor(cell / SIZE);
  const column = cell % SIZE;
  const flips: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    const line: number[] = [];
    let r = row + dr;
    let c = column + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === other(mark)) {
      line.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (line.length > 0 && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === mark) flips.push(...line);
  }
  return flips;
}

/** Casillas donde `mark` puede jugar. */
export function legalMoves(board: readonly Cell[], mark: Mark): number[] {
  const moves: number[] = [];
  for (let cell = 0; cell < SIZE * SIZE; cell++) if (flipsFor(board, mark, cell).length > 0) moves.push(cell);
  return moves;
}

export type MoveError = "game_over" | "not_your_turn" | "invalid_cell" | "occupied" | "illegal";

export function play(
  state: ReversiState,
  mark: Mark,
  cell: number,
): { ok: true; state: ReversiState } | { ok: false; error: MoveError } {
  if (state.turn === null) return { ok: false, error: "game_over" };
  if (state.turn !== mark) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(cell) || cell < 0 || cell >= SIZE * SIZE) return { ok: false, error: "invalid_cell" };
  if (state.board[cell] !== null) return { ok: false, error: "occupied" };
  const flipped = flipsFor(state.board, mark, cell);
  if (flipped.length === 0) return { ok: false, error: "illegal" };

  const board = [...state.board];
  board[cell] = mark;
  for (const index of flipped) board[index] = mark;
  const score = { x: board.filter((value) => value === "x").length, o: board.filter((value) => value === "o").length };
  const moves = [...state.moves, cell];

  // Le toca al rival; si no puede, pasa y vuelve a jugar el mismo; si ninguno puede, se acaba.
  let turn: Mark | null = other(mark);
  let passed: Mark | null = null;
  if (legalMoves(board, turn).length === 0) {
    if (legalMoves(board, mark).length > 0) {
      passed = turn;
      turn = mark;
      moves.push(PASS);
    } else {
      turn = null;
    }
  }
  const finished = turn === null;
  const winner = finished && score.x !== score.o ? (score.x > score.o ? "x" : "o") : null;

  return {
    ok: true,
    state: { board, moves, turn, winner, draw: finished && !winner, score, last: cell, flipped, passed },
  };
}

/**
 * Reconstruye la partida; devuelve null si algún movimiento no es válido.
 * Los PASS los vuelven a poner las jugadas, así que al final la lista tiene
 * que coincidir: un PASS de más o de menos invalida la partida.
 */
export function replay(moves: readonly number[]): ReversiState | null {
  let state = newGame();
  for (const cell of moves) {
    if (cell === PASS) continue;
    const result = play(state, state.turn ?? "x", cell);
    if (!result.ok) return null;
    state = result.state;
  }
  return state.moves.length === moves.length && state.moves.every((move, i) => move === moves[i]) ? state : null;
}
