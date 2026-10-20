import type { Cell } from "@repo/games/tictactoe";

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

const CELL_NAMES = [
  "arriba a la izquierda",
  "arriba en el centro",
  "arriba a la derecha",
  "en el centro a la izquierda",
  "en el centro",
  "en el centro a la derecha",
  "abajo a la izquierda",
  "abajo en el centro",
  "abajo a la derecha",
];

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
  return (
    <div className="ttt-board" role="grid" aria-label="Tablero de 3 en raya">
      {board.map((value, index) => {
        const empty = value === null;
        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            disabled={!canPlay || !empty}
            onClick={() => onPlay(index)}
            aria-label={`Casilla ${CELL_NAMES[index]}${value ? `: ${value.toUpperCase()}` : ""}`}
            className={`ttt-cell ${line?.includes(index) ? "ttt-cell-win" : ""} ${canPlay && empty ? "ttt-cell-open" : ""}`}
          >
            {value && <MarkGlyph mark={value} />}
          </button>
        );
      })}
    </div>
  );
}
