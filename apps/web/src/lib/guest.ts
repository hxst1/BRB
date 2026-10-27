import type { MatchGame } from "@/lib/games";

/**
 * Juegos a los que se puede retar desde un enlace de invitación: los de por
 * turnos (los de en directo necesitan a los dos conectados a la vez). Igual
 * que en challenge_inviter (migración guest_play). El primero, por defecto.
 */
export const INVITE_GAMES: MatchGame[] = ["connect4", "tictactoe", "reversi", "dots", "rps", "chess"];

export function inviteGame(value: unknown): MatchGame {
  return INVITE_GAMES.includes(value as MatchGame) ? (value as MatchGame) : INVITE_GAMES[0]!;
}

/** Enlace para invitar a jugar a alguien que aún no tiene cuenta. */
export function inviteUrl(origin: string, code: string, game?: MatchGame): string {
  const url = `${origin}/invita/${code}`;
  return game && INVITE_GAMES.includes(game) ? `${url}?juego=${game}` : url;
}
