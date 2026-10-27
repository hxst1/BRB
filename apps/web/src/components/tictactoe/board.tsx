import type { Cell } from "@repo/games/tictactoe";
import { useMessages } from "@/lib/i18n/client";

/** Trazos en SVG que se dibujan al aparecer (ver .ttt-mark en globals.css). */
function MarkGlyph({ mark }: { mark: "x" | "o" }) {
  return mark === "x" ? (
    <svg viewBox="0 0 100 100" className="ttt-mark ttt-x" aria-hidden>
      <path d="M26 26 74 74" />
      <path d="M74 26 26 74" style={{ animationDelay: "90ms" }} />
    </svg>
  ) : (
    <svg viewBox="0 0 100 100" className="ttt-mark ttt-o" aria-hidden>
      <circle cx="50" cy="50" r="25" />
    </svg>
  );
}

export function TicTacToeBoard({
  board,
  line,
  canPlay,
  onPlay,
}: {
  board: Cell[];
  line: number[] | null;
  canPlay: boolean;
  onPlay: (cell: number) => void;
}) {
  const m = useMessages();
  return (
    <div className="ttt-board" role="grid" aria-label={m.boards.tictactoe}>
      {board.map((value, index) => {
        const empty = value === null;
        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            disabled={!canPlay || !empty}
            onClick={() => onPlay(index)}
            aria-label={m.boards.cell(m.boards.cells[index]!, value ? value.toUpperCase() : null)}
            className={`ttt-cell ${line?.includes(index) ? "ttt-cell-win" : ""} ${canPlay && empty ? "ttt-cell-open" : ""}`}
          >
            {value && <MarkGlyph mark={value} />}
          </button>
        );
      })}
    </div>
  );
}
