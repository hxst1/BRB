import { GameIcon, type IconName } from "@/components/game-icon";

/** Ids de lib/seo.ts que no coinciden con el nombre de su icono. */
const ICON_OF: Record<string, IconName> = { "lights-out": "lightsout" };

/**
 * El icono del juego en una casilla clara teñida con su color, para las
 * novedades y el aviso de juegos nuevos. Clara también en el tema oscuro: los
 * iconos llevan contorno oscuro y sobre fondo oscuro no se verían.
 */
export function GameTile({ game, accent }: { game: string; accent: string }) {
  return (
    <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${accent} 24%, #ffffff)` }}>
      <GameIcon name={ICON_OF[game] ?? (game as IconName)} className="size-10" />
    </span>
  );
}
