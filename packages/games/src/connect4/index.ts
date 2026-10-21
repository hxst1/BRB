/**
 * 4 en raya. Tablero de 7 columnas por 6 filas; las fichas caen por la
 * columna hasta la casilla libre más baja. Una partida es su lista de
 * movimientos (la columna de cada jugada, 0-6) y el estado se deriva
 * repitiéndolos. X siempre mueve primero.
 */

import type { Mark } from "../tictactoe";

export type { Mark };
export type Cell = Mark | null;

export const COLUMNS = 7;
export const ROWS = 6;

export interface Connect4State {
  /** Casillas en orden de filas, de arriba (fila 0) a abajo. */
  board: Cell[];
  moves: number[];
  /** A quién le toca; null si la partida ha terminado. */
  turn: Mark | null;
  winner: Mark | null;
  /** Las casillas de la línea ganadora, para resaltarlas. */
  line: number[] | null;
  draw: boolean;
  /** Casilla donde cayó la última ficha (para animarla). */
  last: number | null;
}

export function newGame(): Connect4State {
  return { board: Array<Cell>(COLUMNS * ROWS).fill(null), moves: [], turn: "x", winner: null, line: null, draw: false, last: null };
}

/** Fila libre más baja de una columna, o -1 si está llena. */
export function dropRow(board: readonly Cell[], column: number): number {
  for (let row = ROWS - 1; row >= 0; row--) if (board[row * COLUMNS + column] === null) return row;
  return -1;
}

const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↙
] as const;

/** Si la ficha recién puesta forma 4 (o más) en línea, devuelve esas casillas. */
function lineThrough(board: readonly Cell[], row: number, column: number, mark: Mark): number[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const cells = [row * COLUMNS + column];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = column + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r * COLUMNS + c] === mark) {
        cells.push(r * COLUMNS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells.sort((a, b) => a - b);
  }
  return null;
}

export type MoveError = "game_over" | "not_your_turn" | "invalid_column" | "full";

export function play(
  state: Connect4State,
  mark: Mark,
  column: number,
): { ok: true; state: Connect4State } | { ok: false; error: MoveError } {
  if (state.turn === null) return { ok: false, error: "game_over" };
  if (state.turn !== mark) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) return { ok: false, error: "invalid_column" };
  const row = dropRow(state.board, column);
  if (row < 0) return { ok: false, error: "full" };

  const board = [...state.board];
  const cell = row * COLUMNS + column;
  board[cell] = mark;
  const line = lineThrough(board, row, column, mark);
  const draw = !line && board.every((value) => value !== null);

  return {
    ok: true,
    state: {
      board,
      moves: [...state.moves, column],
      turn: line || draw ? null : mark === "x" ? "o" : "x",
      winner: line ? mark : null,
      line,
      draw,
      last: cell,
    },
  };
}

/** Reconstruye la partida; devuelve null si algún movimiento no es válido. */
export function replay(moves: readonly number[]): Connect4State | null {
  let state = newGame();
  for (const column of moves) {
    const result = play(state, state.turn ?? "x", column);
    if (!result.ok) return null;
    state = result.state;
  }
  return state;
}
