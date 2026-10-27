import { BOXES, horizontalEdge, verticalEdge, type Mark } from "@repo/games/dots";
import type { CSSProperties } from "react";
import { useMessages } from "@/lib/i18n/client";

const LINE_COLOR: Record<Mark, string> = { x: "var(--mark-x)", o: "var(--mark-o)" };

/**
 * Tablero de puntos y cajas: una cuadrícula en la que se alternan puntos,
 * rayas y cajas (ver .dots-* en globals.css). Cada raya es un botón que
 * ocupa todo el hueco entre dos puntos, para acertar fácil con el dedo; en tu
 * turno, al pasar por encima se ve de tu color.
 */
export function DotsBoard({
  edges,
  boxes,
  last,
  closed,
  me,
  canPlay,
  onPlay,
}: {
  edges: (Mark | null)[];
  boxes: (Mark | null)[];
  last: number | null;
  closed: number[];
  me: Mark;
  canPlay: boolean;
  onPlay: (edge: number) => void;
}) {
  const m = useMessages();
  const tracks = BOXES * 2 + 1;
  const cells = [];

  for (let r = 0; r < tracks; r++) {
    for (let c = 0; c < tracks; c++) {
      const row = r >> 1;
      const column = c >> 1;
      const key = `${r}-${c}`;
      if (r % 2 === 0 && c % 2 === 0) {
        cells.push(<span key={key} className="dots-dot" />);
      } else if (r % 2 === 1 && c % 2 === 1) {
        const box = row * BOXES + column;
        const owner = boxes[box];
        cells.push(
          <span
            key={key}
            className={`dots-box display ${owner && closed.includes(box) ? "dots-box-new" : ""}`}
            style={owner ? { background: `color-mix(in srgb, ${LINE_COLOR[owner]} 30%, transparent)`, color: LINE_COLOR[owner] } : undefined}
          >
            {owner && (owner === "x" ? "×" : "○")}
          </span>,
        );
      } else {
        const horizontal = r % 2 === 0;
        const edge = horizontal ? horizontalEdge(row, column) : verticalEdge(row, column);
        const owner = edges[edge];
        const open = canPlay && !owner;
        cells.push(
          <button
            key={key}
            type="button"
            disabled={!open}
            onClick={() => onPlay(edge)}
            aria-label={horizontal ? m.dots.horizontal(row + 1, column + 1) : m.dots.vertical(row + 1, column + 1)}
            className={`dots-edge ${horizontal ? "dots-edge-h" : "dots-edge-v"} ${open ? "dots-edge-open" : ""} ${edge === last ? "dots-edge-last" : ""}`}
            style={{ "--line": owner ? LINE_COLOR[owner] : LINE_COLOR[me] } as CSSProperties}
          >
            <span className={`dots-line ${owner ? "dots-line-drawn" : ""}`} />
          </button>,
        );
      }
    }
  }

  return (
    <div className="dots-board" role="group" aria-label={m.dots.board}>
      {cells}
    </div>
  );
}
