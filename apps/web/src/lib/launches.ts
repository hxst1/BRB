/**
 * Aviso por notificación de los juegos nuevos (ver la migración
 * game_launch_push): de qué juegos toca avisar y a quién, y con qué texto.
 */
import type { GameId } from "@/components/home/game-cards";
import type { Messages } from "@/lib/i18n";
import type { PushMessage } from "@/lib/push";

/** Pasado este tiempo desde que sale, un juego ya no se anuncia (por si el aviso no pudo salir a tiempo). */
export const LAUNCH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export type Launch = { id: GameId; path: string; addedAt: number };

/** Juegos ya publicados, de los últimos días y sin anunciar. */
export function pendingLaunches(games: Launch[], announced: ReadonlySet<string>, now: number): Launch[] {
  return games.filter((game) => game.addedAt <= now && now - game.addedAt <= LAUNCH_WINDOW_MS && !announced.has(game.id));
}

/**
 * De cuáles avisar a alguien: los que salieron después de crear su cuenta
 * (quien llega después los ve al entrar) y que aún no ha visto (el aviso de
 * juego nuevo de la app los apunta en seen_announcements).
 */
export function launchesFor(launches: Launch[], user: { createdAt: number; seen: ReadonlySet<string> }): Launch[] {
  return launches.filter((game) => game.addedAt > user.createdAt && !user.seen.has(game.id));
}

export function launchMessage(m: Messages, games: Launch[]): PushMessage {
  if (games.length === 1) {
    const card = m.gameCards[games[0]!.id];
    return { title: m.push.newGame(card.title), body: m.push.newGameBody(card.subtitle), url: games[0]!.path, tag: "new-game" };
  }
  return {
    title: m.push.newGames(games.map((game) => m.gameCards[game.id].title)),
    body: m.push.newGamesBody,
    url: "/",
    tag: "new-game",
  };
}
