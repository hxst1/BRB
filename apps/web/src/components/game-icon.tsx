import type { MatchGame } from "@/lib/games";

export type IconName = MatchGame | "2048" | "snake" | "lightsout" | "minesweeper" | "sudoku" | "friend";

/** Los que ya existen en otro sitio: el caballo del ajedrez y las manos de piedra, papel o tijera. */
const SHARED: Partial<Record<IconName, string>> = {
  chess: "/chess/rn.svg",
  rps: "/rps/scissors-x.svg",
  rpsls: "/rps/spock-x.svg",
};

/**
 * Icono de un juego (public/icons): colores planos con contorno oscuro, como
 * las piezas del ajedrez. Es decorativo: el nombre del juego va siempre al lado.
 */
export function GameIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SHARED[name] ?? `/icons/${name}.svg`} alt="" aria-hidden draggable={false} className={className} />
  );
}
