"use client";

import { useState, type PointerEvent } from "react";
import { useMessages } from "@/lib/i18n/client";

/** Las casillas que cambia un toque: ella y sus vecinas de arriba, abajo, izquierda y derecha. */
export function crossOf(size: number, cell: number): Set<number> {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const cells = new Set([cell]);
  if (row > 0) cells.add(cell - size);
  if (row < size - 1) cells.add(cell + size);
  if (col > 0) cells.add(cell - 1);
  if (col < size - 1) cells.add(cell + 1);
  return cells;
}

/**
 * Tablero de Lights Out. Al pasar el ratón por una casilla (o mientras se
 * mantiene el dedo encima) se marca la cruz que cambiará al tocarla: así se
 * entiende el juego sin leer las reglas. `targets` resalta casillas que
 * conviene tocar (el tutorial).
 */
export function LightsBoard({
  lights,
  size,
  label,
  disabled = false,
  targets,
  onTap,
}: {
  lights: boolean[];
  size: number;
  label: string;
  disabled?: boolean;
  targets?: ReadonlySet<number>;
  onTap: (cell: number) => void;
}) {
  const m = useMessages();
  const [preview, setPreview] = useState<number | null>(null);
  const affected = preview === null || disabled ? null : crossOf(size, preview);
  const show = (cell: number) => (event: PointerEvent) => {
    // Con ratón, al pasar por encima; con el dedo, mientras está apoyado.
    if (event.pointerType === "mouse" || event.type === "pointerdown") setPreview(cell);
  };
  const hide = () => setPreview(null);

  return (
    <div
      role="group"
      aria-label={label}
      onPointerLeave={hide}
      className="grid aspect-square w-full touch-manipulation rounded-[22px] p-[3%] select-none"
      style={{ background: "var(--board)", gridTemplateColumns: `repeat(${size}, 1fr)`, gap: `${12 / size}%` }}
    >
      {lights.map((on, cell) => {
        const marked = affected?.has(cell) ?? false;
        const target = targets?.has(cell) ?? false;
        return (
          <button
            key={cell}
            type="button"
            aria-pressed={on}
            aria-label={m.lightsOut.cellAria(Math.floor(cell / size) + 1, (cell % size) + 1)}
            disabled={disabled}
            onClick={() => onTap(cell)}
            onPointerEnter={show(cell)}
            onPointerDown={show(cell)}
            onPointerUp={(event) => event.pointerType !== "mouse" && hide()}
            onPointerCancel={hide}
            className={`relative rounded-[22%] transition-[background-color,box-shadow,transform] duration-150 active:scale-95 disabled:active:scale-100 ${
              target ? "lights-target" : ""
            }`}
            style={{
              background: on ? "var(--t128)" : "var(--cell)",
              boxShadow: [
                on ? "0 0 18px -2px color-mix(in srgb, var(--t128) 70%, transparent)" : "",
                marked ? "inset 0 0 0 3px color-mix(in srgb, var(--ink) 70%, transparent)" : "",
              ]
                .filter(Boolean)
                .join(", ") || "none",
            }}
          >
            {/* Lo que pasará al tocar: las encendidas se apagan y al revés. */}
            {marked && (
              <span
                aria-hidden
                className="absolute inset-[30%] rounded-full opacity-60"
                style={{ background: on ? "var(--cell)" : "var(--t128)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
