import type { CSSProperties, PointerEventHandler, ReactNode } from "react";
import { SIZE, type Game2048State } from "@repo/games/2048";

/** Texto oscuro sobre las fichas claras y claro sobre las saturadas. */
const LIGHT_INK = new Set([64, 2048]);

function tileStyle(value: number, index: number): CSSProperties {
  const digits = String(value).length;
  const known = value <= 2048;
  return {
    "--x": index % SIZE,
    "--y": Math.floor(index / SIZE),
    "--tile-bg": known ? `var(--t${value})` : "var(--t-high)",
    "--tile-ink": value <= 4 ? "var(--ink)" : !known ? "var(--bg)" : LIGHT_INK.has(value) ? "#fff" : "#15171c",
    "--tile-scale": digits <= 2 ? 0.44 : digits === 3 ? 0.37 : digits === 4 ? 0.29 : 0.23,
  } as CSSProperties;
}

type RenderedTile = { key: number; value: number; index: number; className: string };

/**
 * Las fichas fusionadas se dibujan junto a sus dos "fantasmas" (las fichas de
 * origen, con su id anterior) para que React reutilice esos nodos y se vean
 * deslizarse hasta la casilla destino antes de que aparezca la nueva.
 */
function renderedTiles(state: Game2048State): RenderedTile[] {
  const tiles: RenderedTile[] = [];
  state.cells.forEach((tile, index) => {
    if (!tile) return;
    if (tile.mergedFrom) {
      for (const id of tile.mergedFrom) {
        tiles.push({ key: id, value: tile.value / 2, index, className: "tile tile-ghost" });
      }
      tiles.push({ key: tile.id, value: tile.value, index, className: "tile tile-merged" });
    } else {
      tiles.push({ key: tile.id, value: tile.value, index, className: tile.isNew ? "tile tile-new" : "tile" });
    }
  });
  // Orden estable en el DOM: mover nodos de sitio puede cortar las transiciones.
  return tiles.sort((a, b) => a.key - b.key);
}

export function Board({
  state,
  onPointerDown,
  children,
}: {
  state: Game2048State;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  children?: ReactNode;
}) {
  return (
    <div
      className="board"
      role="application"
      aria-label="Tablero de 2048. Usa las flechas para mover las fichas."
      onPointerDown={onPointerDown}
    >
      {Array.from({ length: SIZE * SIZE }, (_, index) => (
        <div key={index} className="board-cell" style={tileStyle(0, index)} aria-hidden />
      ))}
      {renderedTiles(state).map((tile) => (
        <div key={tile.key} className={tile.className} style={tileStyle(tile.value, tile.index)}>
          <div className="tile-face">{tile.value}</div>
        </div>
      ))}
      {children}
    </div>
  );
}
