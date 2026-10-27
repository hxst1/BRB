/**
 * Retos diarios: cuatro cada día (puzle, arcade, Wordle y duelo con amigos).
 * El servidor es quien decide qué toca (private.daily_slot y daily_duel); esto
 * es para enseñarlo. Las listas y la rotación tienen que coincidir con las de
 * la migración (lo comprueba daily.test.ts).
 */
import type { Messages } from "@/lib/i18n";

/** `guide`: id del juego en lib/how-to-play.ts. Los nombres están en m.daily.games. */
export const DAILY_GAMES: Record<string, { path: string; time: boolean; guide: string }> = {
  "2048": { path: "/2048", time: false, guide: "2048" },
  snake: { path: "/snake", time: false, guide: "snake" },
  lightsout: { path: "/lights-out", time: false, guide: "lights-out" },
  "minesweeper-medium": { path: "/buscaminas", time: true, guide: "minesweeper" },
  "sudoku-medium": { path: "/sudoku", time: true, guide: "sudoku" },
  "queens-medium": { path: "/reinas", time: true, guide: "queens" },
  solitaire: { path: "/solitario", time: true, guide: "solitaire" },
};

export type DailySlot = "puzzle" | "arcade" | "wordle" | "duel";

/** Lo que va rotando cada día, en el mismo orden que private.daily_pool. */
export const DAILY_POOLS = {
  puzzle: ["sudoku-medium", "queens-medium", "minesweeper-medium", "solitaire"],
  arcade: ["2048", "snake", "lightsout"],
  duel: ["connect4", "reversi", "dots", "tictactoe", "typing", "battleship", "rps", "pong", "tron"],
} as const;

/** Día 0 de la rotación (un lunes): como private.daily_rotation. */
const ROTATION_START = Date.UTC(2026, 0, 5);

/** Qué toca un día (AAAA-MM-DD) de una lista. */
export function dailyRotation<T>(pool: readonly T[], day: string): T {
  const days = Math.round((Date.parse(`${day}T00:00:00Z`) - ROTATION_START) / 86_400_000);
  return pool[((days % pool.length) + pool.length) % pool.length]!;
}

/** Resultado del reto con su unidad: "12.840 puntos", "7 niveles", "1:23,4". */
export function formatDailyScore(game: string | null | undefined, score: number, m: Messages): string {
  if (game && DAILY_GAMES[game]?.time) return m.format.time(score);
  if (game === "lightsout") return m.daily.levels(m.format.number(score), score);
  return m.daily.points(m.format.number(score));
}

/** Nombre del juego del reto ("Buscaminas (medio)"), o `short` para el corto ("Buscaminas"). */
export function dailyGameName(game: string | null | undefined, m: Messages, short = false): string {
  const names = game ? m.daily.games[game as keyof Messages["daily"]["games"]] : undefined;
  return names ? (short ? names.short : names.name) : m.daily.theChallenge;
}
