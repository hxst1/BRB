/**
 * Reto diario: qué juego toca cada día. El servidor es quien decide
 * (private.daily_challenge); esto es para enseñarlo. La rotación tiene que
 * coincidir con la de la migración (lo comprueba daily.test.ts).
 */
export const DAILY_GAMES: Record<string, { name: string; short: string; path: string; time: boolean }> = {
  "2048": { name: "2048", short: "2048", path: "/2048", time: false },
  snake: { name: "Snake", short: "Snake", path: "/snake", time: false },
  "minesweeper-medium": { name: "Buscaminas (medio)", short: "Buscaminas", path: "/buscaminas", time: true },
  lightsout: { name: "Lights Out", short: "Lights Out", path: "/lights-out", time: false },
  "sudoku-medium": { name: "Sudoku (medio)", short: "Sudoku", path: "/sudoku", time: true },
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
export function formatDailyScore(game: string | null | undefined, score: number, formatNumber: (n: number) => string, formatTime: (ms: number) => string): string {
  if (game && DAILY_GAMES[game]?.time) return formatTime(score);
  if (game === "lightsout") return `${formatNumber(score)} ${score === 1 ? "nivel" : "niveles"}`;
  return `${formatNumber(score)} puntos`;
}

export function dailyGameName(game: string | null | undefined): string {
  return (game && DAILY_GAMES[game]?.name) || "el reto";
}
