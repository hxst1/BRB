import { createRng, nextInt } from "../rng";

/**
 * Parejas: 20 cartas boca abajo (10 parejas de monstruos) en un tablero de
 * 4 × 5. Por turnos se giran dos: si son iguales se quedan boca arriba; si no,
 * se vuelven a tapar.
 *
 * Puntos: 100 por pareja, 50 más por cada pareja seguida sin fallar (la
 * segunda seguida +50, la tercera +100…), −20 por fallo y, al terminar, 10 por
 * cada segundo que sobre de 90.
 *
 * A diferencia de los demás juegos, el navegador no puede conocer el tablero
 * (con él se resolvería sin fallar): con sesión, el servidor lo calcula con un
 * secreto, enseña cada carta al girarla y apunta los giros. Aquí solo está la
 * lógica, que no sabe de dónde sale el tablero.
 */

export const COLS = 4;
export const ROWS = 5;
export const PAIRS = 10;
export const CARDS = PAIRS * 2;

export const POINTS_PER_PAIR = 100;
export const STREAK_BONUS = 50;
export const FAIL_PENALTY = 20;
/** Tiempo de referencia: cada segundo que sobre al terminar suma POINTS_PER_SECOND. */
export const PAR_MS = 90_000;
export const POINTS_PER_SECOND = 10;

/** La pareja (0-9) de cada carta. */
export type Board = number[];

/** Reparte las cartas a partir de una semilla. */
export function dealBoard(seed: number): Board {
  const cards = Array.from({ length: CARDS }, (_, i) => i % PAIRS);
  let rng = createRng(seed);
  for (let i = cards.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1);
    rng = next;
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return cards;
}

export interface PairsState {
  /** Cartas ya emparejadas. */
  matched: boolean[];
  /** Primera carta del turno en curso, o null si toca girar la primera. */
  open: number | null;
  pairs: number;
  fails: number;
  /** Parejas seguidas sin fallar. */
  streak: number;
  bestStreak: number;
  /** Puntos sin el bonus de tiempo (pueden bajar de 0 a mitad de partida). */
  points: number;
  /** Giros, codificados (ver encodeCard). */
  flips: string;
  over: boolean;
}

export function newGame(): PairsState {
  return { matched: Array(CARDS).fill(false), open: null, pairs: 0, fails: 0, streak: 0, bestStreak: 0, points: 0, flips: "", over: false };
}

/** ¿Se puede girar esa carta? Ni una ya emparejada ni la que ya está boca arriba. */
export function canFlip(state: PairsState, card: number): boolean {
  return !state.over && Number.isInteger(card) && card >= 0 && card < CARDS && !state.matched[card] && card !== state.open;
}

/** Gira una carta. Si es la segunda del turno, se resuelve: pareja o fallo. */
export function flip(state: PairsState, board: Board, card: number): PairsState {
  if (!canFlip(state, card)) return state;
  const flips = state.flips + encodeCard(card);
  if (state.open === null) return { ...state, open: card, flips };

  if (board[state.open] !== board[card]) {
    return { ...state, open: null, flips, fails: state.fails + 1, streak: 0, points: state.points - FAIL_PENALTY };
  }
  const matched = [...state.matched];
  matched[state.open] = true;
  matched[card] = true;
  const streak = state.streak + 1;
  const pairs = state.pairs + 1;
  return {
    ...state,
    matched,
    open: null,
    flips,
    pairs,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    points: state.points + POINTS_PER_PAIR + STREAK_BONUS * (streak - 1),
    over: pairs === PAIRS,
  };
}

/** Bonus por rapidez al terminar. */
export function timeBonus(elapsedMs: number): number {
  return Math.max(0, Math.floor((PAR_MS - elapsedMs) / 1000)) * POINTS_PER_SECOND;
}

/** Puntuación de una partida terminada en `elapsedMs`. */
export function finalScore(state: PairsState, elapsedMs: number): number {
  return Math.max(0, state.points + timeBonus(elapsedMs));
}

const DIGITS = "0123456789abcdefghij";

/** Cada giro es un carácter: la carta en base 20 (0-9 y a-j). */
export function encodeCard(card: number): string {
  return DIGITS[card]!;
}

export function decodeFlips(encoded: string): number[] | null {
  const cards: number[] = [];
  for (const char of encoded) {
    const card = DIGITS.indexOf(char);
    if (card < 0) return null;
    cards.push(card);
  }
  return cards;
}

export type ReplayResult = { valid: true; state: PairsState } | { valid: false; reason: string };

/** Repite los giros sobre un tablero, comprobando que todos se podían hacer. */
export function replay(board: Board, encoded: string): ReplayResult {
  const cards = decodeFlips(encoded);
  if (!cards) return { valid: false, reason: "Giros mal codificados" };
  let state = newGame();
  for (const [i, card] of cards.entries()) {
    if (!canFlip(state, card)) return { valid: false, reason: `Giro imposible (${i + 1}.º)` };
    state = flip(state, board, card);
  }
  return { valid: true, state };
}
