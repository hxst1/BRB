/**
 * 3 en raya. Una partida es su lista de movimientos (índices 0-8 del tablero);
 * el estado se deriva repitiéndolos. X siempre mueve primero.
 */

export type Mark = "x" | "o";
export type Cell = Mark | null;

export interface TicTacToeState {
  board: Cell[];
  moves: number[];
  /** A quién le toca; null si la partida ha terminado. */
  turn: Mark | null;
  winner: Mark | null;
  /** Las tres casillas ganadoras, para resaltarlas. */
  line: [number, number, number] | null;
  draw: boolean;
}

const LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function newGame(): TicTacToeState {
  return { board: Array<Cell>(9).fill(null), moves: [], turn: "x", winner: null, line: null, draw: false };
}

export type MoveError = "game_over" | "not_your_turn" | "invalid_cell" | "occupied";

export function play(
  state: TicTacToeState,
  mark: Mark,
  cell: number,
): { ok: true; state: TicTacToeState } | { ok: false; error: MoveError } {
  if (state.turn === null) return { ok: false, error: "game_over" };
  if (state.turn !== mark) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return { ok: false, error: "invalid_cell" };
  if (state.board[cell] !== null) return { ok: false, error: "occupied" };

  const board = [...state.board];
  board[cell] = mark;
  const line = LINES.find(([a, b, c]) => board[a] === mark && board[b] === mark && board[c] === mark) ?? null;
  const draw = !line && board.every((value) => value !== null);

  return {
    ok: true,
    state: {
      board,
      moves: [...state.moves, cell],
      turn: line || draw ? null : mark === "x" ? "o" : "x",
      winner: line ? mark : null,
      line,
      draw,
    },
  };
}

/** Reconstruye la partida; devuelve null si algún movimiento no es válido. */
export function replay(moves: readonly number[]): TicTacToeState | null {
  let state = newGame();
  for (const cell of moves) {
    const result = play(state, state.turn ?? "x", cell);
    if (!result.ok) return null;
    state = result.state;
  }
  return state;
}
