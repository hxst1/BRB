/**
 * Aviso de partida terminada, para preguntar qué le parece el juego (ver
 * components/feedback/game-rating-prompt.tsx). Cada juego lo lanza al acabar
 * una partida que cuenta: en solitario, al guardarse; contra amigos, al
 * terminar (MatchSounds y LiveSounds).
 */
export const GAME_FINISHED_EVENT = "game-finished";

/** Id del catálogo (lib/seo.ts) a partir del de game_runs o matches: una valoración por juego, no por dificultad. */
export function catalogGame(game: string): string {
  if (game === "lightsout") return "lights-out";
  if (game === "rpsls") return "rps";
  return game.replace(/-(easy|medium|hard)$/, "");
}

export function reportGameFinished(game: string) {
  window.dispatchEvent(new CustomEvent<string>(GAME_FINISHED_EVENT, { detail: catalogGame(game) }));
}
