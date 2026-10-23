/**
 * Ajedrez por turnos entre amigos. Las reglas (jaques, enroque, captura al
 * paso, coronación y tablas) las aplica chess.js; aquí solo se adaptan a la
 * forma de las demás partidas: una lista de movimientos (números) de la que
 * se deriva el estado repitiéndolos. X juega con blancas y mueve primero.
 */

import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { Mark } from "../tictactoe";

export type { Mark };

/** Pieza en una casilla: color (x = blancas) y tipo (p, n, b, r, q, k). */
export type Piece = { mark: Mark; type: PieceSymbol };

/** Cómo acaba: mate o una de las tablas automáticas. */
export type Ending = "checkmate" | "stalemate" | "threefold" | "fifty" | "material";

export interface ChessState {
  /** Casillas de la a8 a la h1, fila a fila (índice 0 = a8, 63 = h1). */
  board: (Piece | null)[];
  moves: number[];
  /** A quién le toca; null si la partida ha terminado. */
  turn: Mark | null;
  /** El que tiene el turno está en jaque. */
  check: boolean;
  winner: Mark | null;
  ending: Ending | null;
  /** Última jugada (origen y destino), para resaltarla. */
  last: { from: number; to: number } | null;
  fen: string;
}

const PROMOTIONS = ["q", "r", "b", "n"] as const;
export type Promotion = (typeof PROMOTIONS)[number];

/** a8 = 0 … h1 = 63. */
export function squareName(index: number): Square {
  return `${"abcdefgh"[index % 8]}${8 - Math.floor(index / 8)}` as Square;
}

export function squareIndex(square: string): number {
  return (8 - Number(square[1])) * 8 + "abcdefgh".indexOf(square[0]!);
}

/**
 * Un movimiento en un número (cabe en un smallint): origen × 64 + destino, más
 * la pieza de coronación × 4096 (1 dama, 2 torre, 3 alfil, 4 caballo).
 */
export function encodeMove(from: number, to: number, promotion?: Promotion): number {
  return (promotion ? PROMOTIONS.indexOf(promotion) + 1 : 0) * 4096 + from * 64 + to;
}

export function decodeMove(code: number): { from: number; to: number; promotion?: Promotion } | null {
  if (!Number.isInteger(code) || code < 0 || code >= 5 * 4096) return null;
  const promo = Math.floor(code / 4096);
  const rest = code % 4096;
  return { from: Math.floor(rest / 64), to: rest % 64, ...(promo ? { promotion: PROMOTIONS[promo - 1] } : {}) };
}

function stateOf(game: Chess, moves: number[], last: ChessState["last"]): ChessState {
  const board = game.board().flat().map((cell) => (cell ? { mark: cell.color === "w" ? ("x" as const) : ("o" as const), type: cell.type } : null));
  const ending: Ending | null = game.isCheckmate()
    ? "checkmate"
    : game.isStalemate()
      ? "stalemate"
      : game.isThreefoldRepetition()
        ? "threefold"
        : game.isInsufficientMaterial()
          ? "material"
          : game.isDrawByFiftyMoves()
            ? "fifty"
            : null;
  const toMove: Mark = game.turn() === "w" ? "x" : "o";
  return {
    board,
    moves,
    turn: ending ? null : toMove,
    check: game.inCheck(),
    // En el mate, gana el que no tiene el turno.
    winner: ending === "checkmate" ? (toMove === "x" ? "o" : "x") : null,
    ending,
    last,
    fen: game.fen(),
  };
}

export function newGame(): ChessState {
  return stateOf(new Chess(), [], null);
}

export type MoveError = "game_over" | "not_your_turn" | "illegal";

/** Aplica una jugada sobre la partida completa (hace falta el historial para las tablas por repetición). */
function apply(game: Chess, code: number): { from: number; to: number } | null {
  const move = decodeMove(code);
  if (!move) return null;
  try {
    game.move({ from: squareName(move.from), to: squareName(move.to), promotion: move.promotion });
  } catch {
    return null;
  }
  return { from: move.from, to: move.to };
}

/** Reconstruye la partida; devuelve null si algún movimiento no es válido. */
export function replay(moves: readonly number[]): ChessState | null {
  const game = new Chess();
  let last: ChessState["last"] = null;
  for (const code of moves) {
    if (game.isGameOver()) return null;
    last = apply(game, code);
    if (!last) return null;
  }
  return stateOf(game, [...moves], last);
}

export function play(state: ChessState, mark: Mark, code: number): { ok: true; state: ChessState } | { ok: false; error: MoveError } {
  if (state.turn === null) return { ok: false, error: "game_over" };
  if (state.turn !== mark) return { ok: false, error: "not_your_turn" };
  const next = replay([...state.moves, code]);
  return next ? { ok: true, state: next } : { ok: false, error: "illegal" };
}

/** Jugadas legales desde una casilla: destinos y si coronan (para pedir la pieza). */
export function legalMoves(state: ChessState, from: number): { to: number; promotion: boolean }[] {
  if (state.turn === null) return [];
  const game = new Chess(state.fen);
  const seen = new Map<number, boolean>();
  for (const move of game.moves({ square: squareName(from), verbose: true })) {
    seen.set(squareIndex(move.to), Boolean(move.promotion));
  }
  return [...seen].map(([to, promotion]) => ({ to, promotion }));
}
