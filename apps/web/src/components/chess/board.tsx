"use client";

import { useState } from "react";
import { encodeMove, legalMoves, type ChessState, type Mark, type Promotion } from "@repo/games/chess";
import { useMessages } from "@/lib/i18n/client";

const FILES = "abcdefgh";

/** Imagen de una pieza (public/chess, piezas kiwen suwi): rojas (X, las blancas de siempre) o azules. */
export function pieceSrc(mark: Mark, type: string): string {
  return `/chess/${mark === "x" ? "r" : "b"}${type}.svg`;
}

/** Color de las piezas de cada jugador; la última jugada se marca con él, más claro. */
export const PIECE_COLOR: Record<Mark, string> = { x: "var(--chess-red)", o: "var(--chess-blue)" };

/**
 * Tablero de ajedrez. Se toca una pieza propia (se marcan sus jugadas
 * legales) y luego el destino; si el peón corona, se elige la pieza. Quien
 * juega con azules (O) lo ve girado.
 */
export function ChessBoard({
  state,
  me,
  canPlay,
  onMove,
}: {
  state: ChessState;
  me: Mark;
  canPlay: boolean;
  onMove: (move: number) => void;
}) {
  const m = useMessages();
  const [selected, setSelected] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<{ from: number; to: number } | null>(null);
  const targets = selected === null || !canPlay ? [] : legalMoves(state, selected);
  const order = Array.from({ length: 64 }, (_, i) => (me === "o" ? 63 - i : i));
  const kingInCheck = state.check ? state.board.findIndex((p) => p?.type === "k" && p.mark === (state.turn ?? "")) : -1;

  function tap(square: number) {
    if (!canPlay) return;
    const target = targets.find((t) => t.to === square);
    if (selected !== null && target) {
      if (target.promotion) setPromotion({ from: selected, to: square });
      else onMove(encodeMove(selected, square));
      setSelected(null);
      return;
    }
    const piece = state.board[square];
    setSelected(piece && piece.mark === me && square !== selected ? square : null);
  }

  function promote(type: Promotion) {
    if (!promotion) return;
    onMove(encodeMove(promotion.from, promotion.to, type));
    setPromotion(null);
  }

  return (
    <div className="relative w-full">
      <div
        role="grid"
        aria-label={m.chess.board}
        className="grid aspect-square w-full grid-cols-8 gap-[3px] rounded-[18px] p-1.5 select-none sm:gap-1 sm:p-2"
        style={{ background: "var(--board)" }}
      >
        {order.map((square, i) => {
          const file = square % 8;
          const rank = 8 - Math.floor(square / 8);
          const dark = (file + Math.floor(square / 8)) % 2 === 1;
          const piece = state.board[square];
          const target = targets.find((t) => t.to === square);
          const lastMove = state.last && (state.last.from === square || state.last.to === square);
          const mover = state.last ? state.board[state.last.to]?.mark : undefined;
          const background = selected === square
            ? "color-mix(in srgb, var(--t128) 65%, var(--cell))"
            : lastMove && mover
              ? `color-mix(in srgb, ${PIECE_COLOR[mover]} 38%, ${dark ? "var(--chess-dark)" : "var(--chess-light)"})`
              : dark
                ? "var(--chess-dark)"
                : "var(--chess-light)";
          return (
            <button
              key={square}
              type="button"
              role="gridcell"
              aria-label={`${FILES[file]}${rank}${piece ? `: ${m.chess.pieces[piece.type]} ${piece.mark === "x" ? m.chess.red : m.chess.blue}` : ""}`}
              aria-selected={selected === square}
              disabled={!canPlay}
              onClick={() => tap(square)}
              className="relative grid aspect-square place-items-center rounded-[22%] transition-colors disabled:cursor-default"
              style={{
                background,
                boxShadow: square === kingInCheck ? "inset 0 0 0 3px var(--mark-x), inset 0 0 18px var(--mark-x)" : undefined,
              }}
            >
              {/* Coordenadas en el borde izquierdo y en el de abajo, como en un tablero de verdad. */}
              {i % 8 === 0 && (
                <span className="pointer-events-none absolute top-0.5 left-1 text-[9px] font-semibold text-muted">
                  {rank}
                </span>
              )}
              {i >= 56 && (
                <span className="pointer-events-none absolute right-1 bottom-0 text-[9px] font-semibold text-muted">
                  {FILES[file]}
                </span>
              )}
              {piece && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pieceSrc(piece.mark, piece.type)} alt="" draggable={false} className="pointer-events-none size-[80%]" />
              )}
              {target && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute rounded-full ${piece ? "inset-[6%] border-4" : "size-[28%]"}`}
                  style={piece ? { borderColor: "color-mix(in srgb, var(--ink) 35%, transparent)" } : { background: "color-mix(in srgb, var(--ink) 30%, transparent)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {promotion && (
        <div className="absolute inset-0 grid place-items-center rounded-[18px] bg-bg/70 backdrop-blur-sm">
          <div role="dialog" aria-label={m.chess.promote} className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-4 shadow-lift">
            <p className="font-semibold">{m.chess.promote}</p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => promote(type)}
                  aria-label={m.chess.pieces[type]}
                  className="grid size-16 place-items-center rounded-2xl transition-transform hover:scale-105"
                  style={{ background: "var(--cell)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pieceSrc(me, type)} alt="" className="size-12" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPromotion(null)} className="text-sm text-muted hover:text-ink">
              {m.common.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
