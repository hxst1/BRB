import type { CSSProperties } from "react";

/**
 * Rojas (X) y azul claro (O), con contorno oscuro: las piezas del ajedrez
 * (public/chess) y las manos de piedra, papel o tijera (public/rps).
 */
export const PIECE_COLOR = { x: "var(--piece-red)", o: "var(--piece-blue)" } as const;

/** Para que los aros de turno y los marcadores (PlayerBadge) usen esos mismos colores. */
export const PIECE_MARK_COLORS = { "--mark-x": PIECE_COLOR.x, "--mark-o": PIECE_COLOR.o } as CSSProperties;
