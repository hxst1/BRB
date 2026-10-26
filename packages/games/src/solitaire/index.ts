import { createRng, nextInt, type RngState } from "../rng";

/**
 * Solitario (Klondike): se roba de una en una y el mazo se puede volver a
 * pasar sin límite. Cada reparto sale de la semilla y tiene solución: se
 * baraja y un solucionador comprueba que se puede terminar (conociendo las
 * cartas tapadas); si no lo demuestra, se vuelve a barajar. Lo mismo en el
 * cliente y en el servidor, así que el reparto no hay que guardarlo.
 *
 * Las cartas son números de 0 a 51: palo = carta / 13 (♠ ♥ ♦ ♣) y número =
 * carta % 13 + 1 (del as al rey).
 */

export const GAME_ID = "solitaire";

export const suit = (card: number) => Math.floor(card / 13);
export const rank = (card: number) => (card % 13) + 1;
export const isRed = (card: number) => suit(card) === 1 || suit(card) === 2;

export interface Column {
  /** Tapadas, de abajo arriba. */
  down: number[];
  /** Destapadas, de abajo arriba: siempre una escalera válida. */
  up: number[];
}

export interface State {
  /** Mazo, boca abajo: la de arriba es la última. */
  stock: number[];
  /** Descarte: la de arriba (la que se juega) es la última. */
  waste: number[];
  /** Cartas en cada montón final, uno por palo y en el orden de los palos. */
  foundations: number[];
  tableau: Column[];
}

/** Montones: "w" el descarte, "0"-"6" las columnas y "A"-"D" los finales (uno por palo). */
export type Pile = "w" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "A" | "B" | "C" | "D";
export type Move = { draw: true } | { from: Pile; to: Pile; count: number };

export const COLUMNS = ["0", "1", "2", "3", "4", "5", "6"] as const satisfies Pile[];
export const FOUNDATIONS = ["A", "B", "C", "D"] as const satisfies Pile[];

export const isColumn = (pile: Pile) => pile >= "0" && pile <= "6";
export const isFoundation = (pile: Pile) => pile >= "A" && pile <= "D";
export const columnIndex = (pile: Pile) => Number(pile);
export const foundationSuit = (pile: Pile) => pile.charCodeAt(0) - 65;
export const foundationPile = (card: number) => FOUNDATIONS[suit(card)]!;

/** Se puede poner `card` encima de `onto` (o en una columna vacía si no hay `onto`). */
export function canStack(card: number, onto: number | undefined): boolean {
  if (onto === undefined) return rank(card) === 13;
  return rank(card) + 1 === rank(onto) && isRed(card) !== isRed(onto);
}

function shuffle(cards: number[], rng: RngState): [number[], RngState] {
  const list = [...cards];
  for (let i = list.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1);
    rng = next;
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return [list, rng];
}

/** Reparto clásico: la columna n lleva n + 1 cartas con la última destapada; el resto, al mazo. */
function deal(rng: RngState): [State, RngState] {
  const [cards, next] = shuffle(
    Array.from({ length: 52 }, (_, card) => card),
    rng,
  );
  const tableau: Column[] = [];
  let taken = 0;
  for (let column = 0; column < 7; column++) {
    const pile = cards.slice(taken, taken + column + 1);
    taken += column + 1;
    tableau.push({ down: pile.slice(0, -1), up: pile.slice(-1) });
  }
  return [{ stock: cards.slice(taken), waste: [], foundations: [0, 0, 0, 0], tableau }, next];
}

/** Barajas que se prueban como mucho (en la práctica basta con una o dos). */
const MAX_DEALS = 40;

/**
 * Posiciones que puede mirar el solucionador por reparto antes de darlo por
 * malo. Con 1000 se tarda unos 10 ms de media y menos de 100 en el peor caso
 * (se genera en el móvil al empezar y en el servidor al validar); con más se
 * aceptan algunos repartos más difíciles de demostrar, pero tarda bastante más.
 */
const SOLVER_BUDGET = 1_000;

export function generate(seed: number): State {
  let rng = createRng(seed);
  let state: State | null = null;
  for (let attempt = 0; attempt < MAX_DEALS; attempt++) {
    [state, rng] = deal(rng);
    if (solve(state, SOLVER_BUDGET)) return state;
  }
  return state!;
}

// ---------------------------------------------------------------------------
// Solucionador: conoce las cartas tapadas y, como se roba de una en una y el
// mazo se puede volver a pasar, cualquier carta del mazo o del descarte se
// puede alcanzar robando: las trata como un montón del que se coge cualquiera
// (y apunta los robos que harían falta). Si encuentra una solución, la hay, y
// la devuelve como movimientos de la partida.
// ---------------------------------------------------------------------------

type Node = {
  f: number[];
  down: number[][];
  up: number[][];
  stock: number[];
  waste: number[];
  /** Movimientos desde la posición anterior (`parent`) hasta esta. */
  steps: Move[];
  parent: Node | null;
};

const pool = (node: Node) => [...node.stock, ...node.waste];

/** Se puede subir sin miedo: ninguna carta de otro color la va a necesitar debajo. */
function safeToFoundation(node: Node, card: number): boolean {
  const r = rank(card);
  if (node.f[suit(card)] !== r - 1) return false;
  if (r <= 2) return true;
  const others = isRed(card) ? [0, 3] : [1, 2];
  return others.every((s) => node.f[s]! >= r - 1);
}

function child(node: Node): Node {
  return {
    f: [...node.f],
    down: node.down.map((d) => [...d]),
    up: node.up.map((u) => [...u]),
    stock: [...node.stock],
    waste: [...node.waste],
    steps: [],
    parent: node,
  };
}

function reveal(node: Node, column: number) {
  if (node.up[column]!.length === 0 && node.down[column]!.length > 0) node.up[column]!.push(node.down[column]!.pop()!);
}

/** Roba (y le da la vuelta al mazo si hace falta) hasta tener `card` en el descarte, y la coge. */
function take(node: Node, card: number) {
  while (node.waste.at(-1) !== card) {
    if (node.stock.length > 0) node.waste.push(node.stock.pop()!);
    else {
      node.stock = node.waste.reverse();
      node.waste = [];
    }
    node.steps.push({ draw: true });
  }
  node.waste.pop();
}

function toFoundationFromColumn(node: Node, column: number) {
  const card = node.up[column]!.pop()!;
  node.f[suit(card)]!++;
  node.steps.push({ from: COLUMNS[column]!, to: foundationPile(card), count: 1 });
  reveal(node, column);
}

function toFoundationFromPool(node: Node, card: number) {
  take(node, card);
  node.f[suit(card)]!++;
  node.steps.push({ from: "w", to: foundationPile(card), count: 1 });
}

function moveRun(node: Node, from: number, start: number, to: number) {
  const cards = node.up[from]!.splice(start);
  node.up[to]!.push(...cards);
  node.steps.push({ from: COLUMNS[from]!, to: COLUMNS[to]!, count: cards.length });
  reveal(node, from);
}

/** Sube a los montones finales todo lo que se puede subir sin miedo. */
function settle(node: Node) {
  for (let moved = true; moved; ) {
    moved = false;
    for (let column = 0; column < 7; column++) {
      const top = node.up[column]!.at(-1);
      if (top !== undefined && safeToFoundation(node, top)) {
        toFoundationFromColumn(node, column);
        moved = true;
      }
    }
    for (const card of pool(node)) {
      if (safeToFoundation(node, card)) {
        toFoundationFromPool(node, card);
        moved = true;
      }
    }
  }
}

function keyOf(node: Node): string {
  let key = node.f.join(",");
  for (let column = 0; column < 7; column++) key += `|${node.down[column]!.length}:${node.up[column]!.join(".")}`;
  return `${key}|${pool(node)
    .sort((a, b) => a - b)
    .join(".")}`;
}

/** Siguientes posiciones, de la que más promete a la que menos. */
function children(node: Node): Node[] {
  const result: Node[] = [];
  const cards = pool(node);

  // 1. Subir una carta a su montón final.
  for (let column = 0; column < 7; column++) {
    const top = node.up[column]!.at(-1);
    if (top !== undefined && node.f[suit(top)] === rank(top) - 1) {
      const next = child(node);
      toFoundationFromColumn(next, column);
      result.push(next);
    }
  }
  for (const card of cards) {
    if (node.f[suit(card)] === rank(card) - 1) {
      const next = child(node);
      toFoundationFromPool(next, card);
      result.push(next);
    }
  }

  // 2. Mover una escalera entera de columna si destapa una carta (o deja hueco para un rey).
  for (let from = 0; from < 7; from++) {
    const run = node.up[from]!;
    if (run.length === 0) continue;
    const empties = node.down[from]!.length === 0;
    for (let to = 0; to < 7; to++) {
      if (to === from) continue;
      const onto = node.up[to]!.at(-1);
      if (onto === undefined && (empties || node.down[to]!.length > 0)) continue;
      if (!canStack(run[0]!, onto)) continue;
      const next = child(node);
      moveRun(next, from, 0, to);
      result.push(next);
    }
  }

  // 3. Del mazo a una columna.
  for (const card of cards) {
    for (let to = 0; to < 7; to++) {
      const onto = node.up[to]!.at(-1);
      if (onto === undefined && node.down[to]!.length > 0) continue;
      if (!canStack(card, onto)) continue;
      const next = child(node);
      take(next, card);
      next.up[to]!.push(card);
      next.steps.push({ from: "w", to: COLUMNS[to]!, count: 1 });
      result.push(next);
      if (onto === undefined) break; // Todas las columnas vacías valen lo mismo.
    }
  }

  // 4. Partir una escalera para que la carta que queda arriba pueda subir.
  for (let from = 0; from < 7; from++) {
    const run = node.up[from]!;
    for (let start = 1; start < run.length; start++) {
      const exposed = run[start - 1]!;
      if (node.f[suit(exposed)] !== rank(exposed) - 1) continue;
      for (let to = 0; to < 7; to++) {
        if (to === from || !canStack(run[start]!, node.up[to]!.at(-1)) || node.up[to]!.length === 0) continue;
        const next = child(node);
        moveRun(next, from, start, to);
        result.push(next);
      }
    }
  }
  return result;
}

/**
 * Una forma de terminar la partida, como movimientos, o null si no la
 * encuentra mirando como mucho `budget` posiciones.
 */
export function solve(state: State, budget: number): Move[] | null {
  const seen = new Set<string>();
  let nodes = 0;
  const root: Node = {
    f: [...state.foundations],
    down: state.tableau.map((column) => [...column.down]),
    up: state.tableau.map((column) => [...column.up]),
    stock: [...state.stock],
    waste: [...state.waste],
    steps: [],
    parent: null,
  };

  const search = (node: Node): Node | null => {
    settle(node);
    // Todo destapado y sin mazo: ya solo queda subir las cartas (finishingMoves).
    if (node.stock.length === 0 && node.waste.length === 0 && node.down.every((d) => d.length === 0)) return node;
    const key = keyOf(node);
    if (seen.has(key) || ++nodes > budget) return null;
    seen.add(key);
    for (const next of children(node)) {
      const found = search(next);
      if (found) return found;
      if (nodes > budget) return null;
    }
    return null;
  };

  const end = search(root);
  if (!end) return null;
  const path: Move[][] = [];
  for (let node: Node | null = end; node; node = node.parent) path.push(node.steps);
  const moves = path.reverse().flat();
  let current = state;
  for (const move of moves) current = applyMove(current, move)!;
  return [...moves, ...(finishingMoves(current) ?? [])];
}

// ---------------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------------

/** Las cartas que se moverían con `from` y `count`, o null si no se puede. */
function taking(state: State, from: Pile, count: number): number[] | null {
  if (from === "w") return count === 1 && state.waste.length > 0 ? [state.waste.at(-1)!] : null;
  if (isFoundation(from)) {
    const s = foundationSuit(from);
    return count === 1 && state.foundations[s]! > 0 ? [s * 13 + state.foundations[s]! - 1] : null;
  }
  const up = state.tableau[columnIndex(from)]!.up;
  return count >= 1 && count <= up.length ? up.slice(-count) : null;
}

/** Aplica un movimiento; null si no vale. Al vaciar las destapadas de una columna se destapa la siguiente. */
export function applyMove(state: State, move: Move): State | null {
  if ("draw" in move) {
    if (state.stock.length > 0) {
      return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, state.stock.at(-1)!] };
    }
    // Mazo vacío: el descarte se vuelve a poner boca abajo.
    if (state.waste.length === 0) return null;
    return { ...state, stock: [...state.waste].reverse(), waste: [] };
  }

  const { from, to, count } = move;
  if (from === to || to === "w") return null;
  const cards = taking(state, from, count);
  if (!cards) return null;
  const first = cards[0]!;

  if (isFoundation(to)) {
    const s = foundationSuit(to);
    if (cards.length !== 1 || suit(first) !== s || rank(first) !== state.foundations[s]! + 1) return null;
  } else {
    const target = state.tableau[columnIndex(to)]!;
    if (target.up.length === 0 && target.down.length > 0) return null;
    if (!canStack(first, target.up.at(-1))) return null;
  }

  const next: State = {
    stock: state.stock,
    waste: from === "w" ? state.waste.slice(0, -1) : state.waste,
    foundations: [...state.foundations],
    tableau: state.tableau.map((column) => ({ down: column.down, up: column.up })),
  };
  if (isFoundation(from)) next.foundations[foundationSuit(from)]!--;
  if (isColumn(from)) {
    const column = next.tableau[columnIndex(from)]!;
    const up = column.up.slice(0, -count);
    next.tableau[columnIndex(from)] =
      up.length === 0 && column.down.length > 0 ? { down: column.down.slice(0, -1), up: [column.down.at(-1)!] } : { down: column.down, up };
  }
  if (isFoundation(to)) next.foundations[foundationSuit(to)]!++;
  else {
    const column = next.tableau[columnIndex(to)]!;
    next.tableau[columnIndex(to)] = { down: column.down, up: [...column.up, ...cards] };
  }
  return next;
}

export const isWon = (state: State) => state.foundations.every((count) => count === 13);

/**
 * Adónde va una carta al tocarla: a su montón final si puede (una sola
 * carta), si no a la primera columna donde encaje, y a una vacía solo si
 * sirve de algo (no se pasea un rey que ya está solo en su columna).
 */
export function autoMove(state: State, from: Pile, count: number): Move | null {
  const cards = taking(state, from, count);
  if (!cards) return null;
  const first = cards[0]!;
  const tryMove = (to: Pile): Move | null => {
    const move = { from, to, count };
    return applyMove(state, move) ? move : null;
  };
  if (count === 1 && !isFoundation(from)) {
    const move = tryMove(foundationPile(first));
    if (move) return move;
  }
  const alone = isColumn(from) && state.tableau[columnIndex(from)]!.down.length === 0 && count === state.tableau[columnIndex(from)]!.up.length;
  let empty: Move | null = null;
  for (const to of COLUMNS) {
    if (to === from) continue;
    const target = state.tableau[columnIndex(to)]!;
    if (target.up.length === 0) {
      if (!empty && !alone) empty = tryMove(to);
      continue;
    }
    const move = tryMove(to);
    if (move) return move;
  }
  return empty;
}

/**
 * Con el mazo y el descarte vacíos y todo destapado, la partida está ganada:
 * los movimientos que suben el resto de cartas a los montones finales.
 */
export function finishingMoves(state: State): Move[] | null {
  if (state.stock.length > 0 || state.waste.length > 0 || state.tableau.some((column) => column.down.length > 0)) return null;
  const moves: Move[] = [];
  let current = state;
  while (!isWon(current)) {
    let progressed = false;
    for (const from of COLUMNS) {
      const top = current.tableau[columnIndex(from)]!.up.at(-1);
      if (top === undefined) continue;
      const move: Move = { from, to: foundationPile(top), count: 1 };
      const next = applyMove(current, move);
      if (next) {
        moves.push(move);
        current = next;
        progressed = true;
      }
    }
    if (!progressed) return null;
  }
  return moves;
}

// ---------------------------------------------------------------------------
// Movimientos como texto: lo que se envía al servidor al terminar
// ---------------------------------------------------------------------------

/** "s" es robar; los demás, origen + destino + cuántas cartas (en base 36). */
export function encodeMoves(moves: readonly Move[]): string {
  return moves.map((move) => ("draw" in move ? "s" : `${move.from}${move.to}${move.count.toString(36)}`)).join("");
}

const TOKEN = /s|([w0-6A-D])([0-6A-D])([1-9a-d])/y;

export function decodeMoves(encoded: string): Move[] | null {
  const moves: Move[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < encoded.length) {
    const match = TOKEN.exec(encoded);
    if (!match) return null;
    moves.push(match[1] ? { from: match[1] as Pile, to: match[2] as Pile, count: parseInt(match[3]!, 36) } : { draw: true });
  }
  return moves;
}

/** Repite una partida desde la semilla. */
export function replay(seed: number, encoded: string): { valid: true; state: State; moves: number } | { valid: false; reason: string } {
  const moves = decodeMoves(encoded);
  if (!moves) return { valid: false, reason: "Movimientos mal codificados" };
  let state = generate(seed);
  for (const [i, move] of moves.entries()) {
    const next = applyMove(state, move);
    if (!next) return { valid: false, reason: `Movimiento ${i + 1} no válido` };
    state = next;
  }
  return { valid: true, state, moves: moves.length };
}
