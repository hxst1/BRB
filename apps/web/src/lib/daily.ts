/**
 * Reto diario: qué juego toca cada día. El servidor es quien decide
 * (private.daily_challenge); esto es para enseñarlo. La rotación tiene que
 * coincidir con la de la migración (lo comprueba daily.test.ts).
 */
import type { Messages } from "@/lib/i18n";

/** `guide`: id del juego en lib/how-to-play.ts. Los nombres están en m.daily.games. */
export const DAILY_GAMES: Record<string, { path: string; time: boolean; guide: string }> = {
  "2048": { path: "/2048", time: false, guide: "2048" },
  snake: { path: "/snake", time: false, guide: "snake" },
  "minesweeper-medium": { path: "/buscaminas", time: true, guide: "minesweeper" },
  lightsout: { path: "/lights-out", time: false, guide: "lights-out" },
  "sudoku-medium": { path: "/sudoku", time: true, guide: "sudoku" },
};

/** Juego de cada día laborable (ISO: 1 = lunes). Sábado y domingo, sorpresa. */
export const WEEKDAY_GAMES: Record<number, string> = {
  1: "2048",
  2: "snake",
  3: "minesweeper-medium",
  4: "lightsout",
  5: "sudoku-medium",
};

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
