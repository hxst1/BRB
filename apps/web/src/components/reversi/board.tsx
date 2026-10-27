import { SIZE, legalMoves, type Cell, type Mark } from "@repo/games/reversi";
import type { CSSProperties } from "react";
import { useMessages } from "@/lib/i18n/client";

const COLUMNS = "abcdefgh";
const PIECE_COLOR: Record<Mark, string> = { x: "var(--mark-x)", o: "var(--mark-o)" };

/**
 * Tablero de Reversi. En tu turno se marcan las casillas donde puedes jugar.
 * La última ficha aparece y las que ha dado la vuelta giran (ver .rv-* en
 * globals.css), un poco después según lo lejos que estén.
 */
export function ReversiBoard({
  board,
  last,
  flipped,
  me,
  canPlay,
  onPlay,
}: {
  board: Cell[];
  last: number | null;
  flipped: number[];
  me: Mark;
  canPlay: boolean;
  onPlay: (cell: number) => void;
}) {
  const m = useMessages();
  const playable = new Set(canPlay ? legalMoves(board, me) : []);
  const origin = last === null ? null : { row: Math.floor(last / SIZE), column: last % SIZE };

  return (
    <div className="rv-board" role="grid" aria-label={m.reversi.board}>
      {Array.from({ length: SIZE }, (_, row) => (
        <div key={row} role="row" className="contents">
          {Array.from({ length: SIZE }, (_, column) => {
            const index = row * SIZE + column;
            const value = board[index];
            const open = playable.has(index);
            const distance = origin ? Math.max(Math.abs(origin.row - row), Math.abs(origin.column - column)) : 0;
            return (
              <button
                key={column}
                type="button"
                role="gridcell"
                disabled={!open}
                onClick={() => onPlay(index)}
                aria-label={m.reversi.cell(`${COLUMNS[column]}${row + 1}`, value === "x" ? "red" : value === "o" ? "blue" : null, open)}
                className={`rv-cell ${open ? "rv-cell-open" : ""}`}
              >
                {value ? (
                  <span
                    className={`rv-piece ${index === last ? "rv-placed" : flipped.includes(index) ? "rv-flip" : ""}`}
                    style={{ background: PIECE_COLOR[value], "--flip-delay": `${distance * 70}ms` } as CSSProperties}
                  />
                ) : (
                  open && <span className="rv-hint" style={{ background: PIECE_COLOR[me] }} />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
