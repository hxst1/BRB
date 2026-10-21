import { CELLS, SIZE, type Fleet, type ShotResult } from "@repo/games/battleship";
import type { CSSProperties } from "react";

const COLUMN_LABELS = "ABCDEFGHIJ";

export type Shot = { cell: number; result: ShotResult };

const at = (cell: number): CSSProperties => ({ gridRow: Math.floor(cell / SIZE) + 1, gridColumn: (cell % SIZE) + 1 });

/** Posición de un barco en la cuadrícula: ocupa sus casillas y el hueco entre ellas. */
function shipArea(ship: number[]): CSSProperties {
  const first = Math.min(...ship);
  const horizontal = ship.length === 1 || ship.includes(first + 1);
  const row = Math.floor(first / SIZE) + 1;
  const column = (first % SIZE) + 1;
  return horizontal
    ? { gridRow: row, gridColumn: `${column} / span ${ship.length}` }
    : { gridRow: `${row} / span ${ship.length}`, gridColumn: column };
}

/**
 * Tablero de 10 × 10 en tres capas sobre la misma cuadrícula: las casillas
 * (que se pueden pulsar para disparar), los barcos (cada uno una pieza entera
 * con contorno) y los disparos: punto azul si es agua, marca roja si es
 * tocado y más oscura si hundió el barco.
 */
export function SeaBoard({
  label,
  fleet,
  shots,
  onShoot,
  highlight,
}: {
  label: string;
  fleet?: Fleet | null;
  shots: Shot[];
  onShoot?: (cell: number) => void;
  /** Último disparo, para resaltarlo. */
  highlight?: number | null;
}) {
  const shotAt = new Map(shots.map((shot) => [shot.cell, shot.result]));
  const shipCells = new Set(fleet?.flat() ?? []);

  return (
    <div className="sea-board" role="group" aria-label={label}>
      {Array.from({ length: CELLS }, (_, cell) => {
        const result = shotAt.get(cell);
        const name = `${COLUMN_LABELS[cell % SIZE]}${Math.floor(cell / SIZE) + 1}`;
        const description = result ? RESULT_LABEL[result] : shipCells.has(cell) ? "barco" : "sin disparar";
        return onShoot && !result ? (
          <button key={cell} type="button" className="sea-cell sea-open" style={at(cell)} aria-label={`Disparar a ${name}`} onClick={() => onShoot(cell)} />
        ) : (
          <span key={cell} role="img" className="sea-cell" style={at(cell)} aria-label={`${name}: ${description}`} />
        );
      })}

      {fleet?.map((ship, i) => {
        const sunk = ship.every((cell) => shotAt.get(cell) === "hit" || shotAt.get(cell) === "sunk");
        return <span key={`ship${i}`} aria-hidden className={`sea-ship ${sunk ? "sea-ship-sunk" : ""}`} style={shipArea(ship)} />;
      })}

      {shots.map((shot) => (
        <span
          key={`shot${shot.cell}`}
          aria-hidden
          className={`sea-mark sea-${shot.result} ${highlight === shot.cell ? "sea-last" : ""}`}
          style={at(shot.cell)}
        />
      ))}
    </div>
  );
}

const RESULT_LABEL: Record<ShotResult, string> = { miss: "agua", hit: "tocado", sunk: "hundido" };
