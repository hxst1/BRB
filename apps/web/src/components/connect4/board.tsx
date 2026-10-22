import { COLUMNS, ROWS, dropRow, type Cell, type Mark } from "@repo/games/connect4";
import type { CSSProperties } from "react";
import { useMessages } from "@/lib/i18n/client";

/**
 * Tablero de 4 en raya: cada columna es un botón (se juega pulsando en
 * cualquier parte de ella). La última ficha cae desde arriba (ver .c4-drop en
 * globals.css) y, en tu turno, se ve dónde caería la tuya al pasar por encima.
 */
export function Connect4Board({
  board,
  line,
  last,
  me,
  canPlay,
  onPlay,
}: {
  board: Cell[];
  line: number[] | null;
  last: number | null;
  me: Mark;
  canPlay: boolean;
  onPlay: (column: number) => void;
}) {
  const m = useMessages();
  return (
    <div className="c4-board" role="group" aria-label="Tablero de 4 en raya">
      {Array.from({ length: COLUMNS }, (_, column) => {
        const target = dropRow(board, column);
        const open = canPlay && target >= 0;
        const filled = ROWS - 1 - target;
        return (
          <button
            key={column}
            type="button"
            disabled={!open}
            onClick={() => onPlay(column)}
            aria-label={m.connect4.column(column + 1, target < 0 ? null : filled)}
            className={`c4-column ${open ? "c4-column-open" : ""}`}
          >
            {Array.from({ length: ROWS }, (_, row) => {
              const index = row * COLUMNS + column;
              const value = board[index];
              return (
                <span key={row} className={`c4-cell ${line?.includes(index) ? "c4-cell-win" : ""}`}>
                  {value ? (
                    <span
                      className={`c4-piece ${index === last ? "c4-drop" : ""}`}
                      style={{ background: PIECE_COLOR[value], "--drop-rows": row + 1 } as CSSProperties}
                    />
                  ) : (
                    row === target && <span className="c4-ghost" style={{ background: PIECE_COLOR[me] }} />
                  )}
                </span>
              );
            })}
          </button>
        );
      })}
    </div>
  );
}

const PIECE_COLOR: Record<Mark, string> = { x: "var(--mark-x)", o: "var(--mark-o)" };
