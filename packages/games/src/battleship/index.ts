import { nextInt, type RngState } from "../rng";
import type { Mark } from "../tictactoe";

/**
 * Hundir la flota. Tablero de 10 × 10 y cinco barcos por jugador. Cada uno
 * coloca su flota (que el rival no ve) y se dispara por turnos alternos; X
 * dispara primero. Gana quien hunde toda la flota del otro.
 *
 * Los disparos son públicos y van en `matches.moves` con su resultado ya
 * resuelto por el servidor: `casilla + 100 × resultado` (0 agua, 1 tocado,
 * 2 hundido). Los pares son de X y los impares de O.
 */

export type { Mark };

export const SIZE = 10;
export const CELLS = SIZE * SIZE;
/** Largo de cada barco, del más grande al más pequeño. */
export const FLEET = [5, 4, 3, 3, 2] as const;
export const SHIP_NAMES = ["Portaaviones", "Acorazado", "Crucero", "Submarino", "Destructor"] as const;
export const FLEET_CELLS = FLEET.reduce((sum, length) => sum + length, 0);

/** Cada barco es la lista de sus casillas (índice fila × 10 + columna). */
export type Fleet = number[][];
export type ShotResult = "miss" | "hit" | "sunk";

const RESULT_CODE: Record<ShotResult, number> = { miss: 0, hit: 1, sunk: 2 };
const CODE_RESULT: ShotResult[] = ["miss", "hit", "sunk"];

export function encodeShot(cell: number, result: ShotResult): number {
  return cell + 100 * RESULT_CODE[result];
}

export function decodeShot(move: number): { cell: number; result: ShotResult } | null {
  const cell = move % 100;
  const result = CODE_RESULT[Math.floor(move / 100)];
  return Number.isInteger(move) && move >= 0 && result ? { cell, result } : null;
}

/** ¿Es una flota válida? Cinco barcos rectos, de los largos de FLEET, dentro del tablero y sin solaparse. */
export function isValidFleet(fleet: unknown): fleet is Fleet {
  if (!Array.isArray(fleet) || fleet.length !== FLEET.length) return false;
  const used = new Set<number>();
  const lengths = fleet.map((ship) => (Array.isArray(ship) ? ship.length : -1)).sort((a, b) => b - a);
  if (lengths.join() !== [...FLEET].join()) return false;

  for (const ship of fleet as unknown[][]) {
    if (!ship.every((cell) => Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < CELLS)) return false;
    const cells = [...(ship as number[])].sort((a, b) => a - b);
    const rows = new Set(cells.map((cell) => Math.floor(cell / SIZE)));
    const horizontal = rows.size === 1 && cells.every((cell, i) => i === 0 || cell === cells[i - 1]! + 1);
    const vertical = cells.every((cell, i) => i === 0 || cell === cells[i - 1]! + SIZE);
    if (!horizontal && !vertical) return false;
    for (const cell of cells) {
      if (used.has(cell)) return false;
      used.add(cell);
    }
  }
  return true;
}

/** Casillas alrededor de una (incluidas las diagonales). */
function around(cell: number): number[] {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const cells: number[] = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) cells.push(r * SIZE + c);
  }
  return cells;
}

/** Flota al azar (para el botón de colocar). Como en el juego clásico, los barcos no se tocan ni en diagonal. */
export function randomFleet(rng: RngState): { fleet: Fleet; rng: RngState } {
  for (;;) {
    // Casillas ocupadas o pegadas a un barco ya colocado.
    const used = new Set<number>();
    const fleet: Fleet = [];
    let ok = true;
    for (const length of FLEET) {
      let placed = false;
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const [orientation, r1] = nextInt(rng, 2);
        const horizontal = orientation === 0;
        const [row, r2] = nextInt(r1, horizontal ? SIZE : SIZE - length + 1);
        const [col, r3] = nextInt(r2, horizontal ? SIZE - length + 1 : SIZE);
        rng = r3;
        const cells = Array.from({ length }, (_, i) => (horizontal ? row * SIZE + col + i : (row + i) * SIZE + col));
        if (cells.some((cell) => used.has(cell))) continue;
        cells.flatMap(around).forEach((cell) => used.add(cell));
        fleet.push(cells);
        placed = true;
      }
      if (!placed) ok = false;
    }
    if (ok) return { fleet, rng };
  }
}

/** Resultado de disparar a `cell` contra `fleet`, sabiendo qué casillas ya se habían tocado. */
export function resolveShot(fleet: Fleet, alreadyHit: ReadonlySet<number>, cell: number): ShotResult {
  const ship = fleet.find((cells) => cells.includes(cell));
  if (!ship) return "miss";
  return ship.every((c) => c === cell || alreadyHit.has(c)) ? "sunk" : "hit";
}

export interface BattleshipState {
  /** Disparos de cada jugador (contra la flota del otro). */
  shots: Record<Mark, { cell: number; result: ShotResult }[]>;
  /** A quién le toca disparar; null si ha terminado (o falta colocar flotas, eso lo decide quien llama). */
  turn: Mark | null;
  winner: Mark | null;
}

/** Reconstruye la partida a partir de los disparos; null si algo no cuadra. */
export function replay(moves: readonly number[]): BattleshipState | null {
  const shots: BattleshipState["shots"] = { x: [], o: [] };
  const hits: Record<Mark, number> = { x: 0, o: 0 };
  let winner: Mark | null = null;
  for (let i = 0; i < moves.length; i++) {
    if (winner) return null;
    const shot = decodeShot(moves[i]!);
    const shooter: Mark = i % 2 === 0 ? "x" : "o";
    if (!shot || shots[shooter].some((s) => s.cell === shot.cell)) return null;
    shots[shooter].push(shot);
    if (shot.result !== "miss") hits[shooter]++;
    if (hits[shooter] === FLEET_CELLS) winner = shooter;
  }
  return { shots, turn: winner ? null : moves.length % 2 === 0 ? "x" : "o", winner };
}

export type ShotError = "game_over" | "not_your_turn" | "invalid_cell" | "already_shot";

/**
 * Dispara contra la flota del rival. Lo usa el servidor, que es el único que
 * conoce esa flota; devuelve los movimientos nuevos y si la partida ha terminado.
 */
export function shoot(
  moves: readonly number[],
  shooter: Mark,
  rivalFleet: Fleet,
  cell: number,
): { ok: true; moves: number[]; result: ShotResult; winner: Mark | null } | { ok: false; error: ShotError } {
  const state = replay(moves);
  if (!state || state.turn === null) return { ok: false, error: "game_over" };
  if (state.turn !== shooter) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return { ok: false, error: "invalid_cell" };
  if (state.shots[shooter].some((s) => s.cell === cell)) return { ok: false, error: "already_shot" };

  const alreadyHit = new Set(state.shots[shooter].filter((s) => s.result !== "miss").map((s) => s.cell));
  const result = resolveShot(rivalFleet, alreadyHit, cell);
  const next = [...moves, encodeShot(cell, result)];
  return { ok: true, moves: next, result, winner: replay(next)?.winner ?? null };
}
