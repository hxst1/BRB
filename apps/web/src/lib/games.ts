/** Juegos contra amigos: nombre para mostrar y ruta de sus partidas. */
export const MATCH_GAMES = {
  tictactoe: { name: "3 en raya", path: "/3-en-raya" },
  connect4: { name: "4 en raya", path: "/4-en-raya" },
  battleship: { name: "Hundir la flota", path: "/hundir-la-flota" },
  rps: { name: "Piedra, papel o tijera", path: "/piedra-papel-tijera" },
  rpsls: { name: "Piedra, papel, tijera, lagarto o Spock", path: "/piedra-papel-tijera" },
  pong: { name: "Pong", path: "/pong" },
  tron: { name: "Tron", path: "/tron" },
  chess: { name: "Ajedrez", path: "/ajedrez" },
} as const;

/** Un reto pendiente se retira solo pasado este tiempo (ver expire_challenges). */
export const CHALLENGE_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

export type MatchGame = keyof typeof MATCH_GAMES;

export function matchGame(game: string) {
  return MATCH_GAMES[game as MatchGame] ?? MATCH_GAMES.tictactoe;
}

/** Clave del juego para m.matchGames (los nombres traducidos). */
export function matchGameKey(game: string): MatchGame {
  return game in MATCH_GAMES ? (game as MatchGame) : "tictactoe";
}

export function matchHref(match: { id: string; game: string }): string {
  return `${matchGame(match.game).path}/${match.id}`;
}
