/**
 * Dibujitos de la interfaz en lugar de emojis (pasos de "¿Cómo se juega?",
 * logros…): colores planos con contorno oscuro, como los iconos de los juegos.
 * Están en public/icons/pictos; algunos se toman de otro sitio.
 */
type PictoFile = "abc" | "apple" | "box" | "comet" | "crash" | "down" | "fast" | "fire" | "flag" | "gamepad" | "goal" | "hand" | "handshake" | "idea" | "keyboard" | "laptop" | "line" | "look" | "megaphone" | "new" | "numbers" | "pencil" | "plus" | "repeat" | "right" | "secret" | "star" | "stop" | "tap" | "target" | "think" | "tile-gray" | "tile-green" | "tile-violet" | "tile-yellow" | "timer" | "trophy" | "up" | "wait" | "water";

/** Los que ya existen como icono de un juego, pieza o mano. */
const SHARED = {
  wave: "/icons/friend.svg",
  ship: "/icons/battleship.svg",
  snake: "/icons/snake.svg",
  paddle: "/icons/pong.svg",
  tron: "/icons/tron.svg",
  bomb: "/icons/minesweeper.svg",
  knight: "/chess/rn.svg",
  scissors: "/rps/scissors-x.svg",
  rock: "/rps/rock-x.svg",
  paper: "/rps/paper-x.svg",
} as const;

export type Picto = PictoFile | keyof typeof SHARED;

export function pictoSrc(picto: Picto): string {
  return picto in SHARED ? SHARED[picto as keyof typeof SHARED] : `/icons/pictos/${picto}.svg`;
}
