"use client";

import { useState } from "react";
import { CHOICES, type Choice, type Mark, type Variant } from "@repo/games/rps";
import { useMessages } from "@/lib/i18n/client";
import { PIECE_COLOR } from "@/lib/piece-colors";

/**
 * Orden alrededor del círculo: cada mano gana a la siguiente (y, con lagarto y
 * Spock, también a la de después). Así las flechas forman el triángulo o el
 * pentágono con su estrella, como el diagrama de toda la vida.
 */
const WHEEL: Record<Variant, readonly Choice[]> = {
  rps: ["rock", "scissors", "paper"],
  rpsls: ["scissors", "paper", "rock", "lizard", "spock"],
};

/** Tamaño de cada mano, en % del lado del diagrama. */
const NODE: Record<Variant, number> = { rps: 28, rpsls: 23 };
const RADIUS: Record<Variant, number> = { rps: 36, rpsls: 38 };
/** Alto del diagrama (el ancho es 100): ni el triángulo ni el pentágono necesitan un cuadrado entero. */
const HEIGHT: Record<Variant, number> = { rps: 84, rpsls: 94 };

/** Mano de cada elección (public/rps, de OpenMoji), del color del jugador: rojas (X) o azules (O). */
export function choiceSrc(choice: Choice, mark: Mark): string {
  return `/rps/${choice}-${mark}.svg`;
}

/**
 * Para elegir: las manos en círculo, con una flecha de cada una a las que gana.
 * Al pasar por encima (o con la elegida) se resaltan sus flechas: en tu color
 * a quién gana y en el del rival quién le gana, y debajo se cuenta con palabras.
 */
export function ChoiceWheel({
  variant,
  me,
  picked,
  canChoose,
  onChoose,
}: {
  variant: Variant;
  me: Mark;
  /** Índice (en CHOICES) de lo ya elegido en esta ronda. */
  picked: number | null;
  canChoose: boolean;
  onChoose: (index: number) => void;
}) {
  const m = useMessages();
  const [hovered, setHovered] = useState<Choice | null>(null);
  const rival: Mark = me === "x" ? "o" : "x";
  const wheel = WHEEL[variant];
  const focus = hovered ?? (picked === null ? null : CHOICES[variant][picked]!);
  const beats = (a: Choice, b: Choice) => b in m.rps.beats[a];

  // Vértices en círculo, empezando arriba, y centrados en altura (el triángulo queda bajo si no).
  const angles = wheel.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / wheel.length);
  const ys = angles.map((a) => Math.sin(a) * RADIUS[variant]);
  const shift = -(Math.min(...ys) + Math.max(...ys)) / 2;
  const height = HEIGHT[variant];
  const points = angles.map((a, i) => ({ x: 50 + Math.cos(a) * RADIUS[variant], y: height / 2 + ys[i]! + shift }));

  const edges = wheel.flatMap((a, i) => wheel.flatMap((b, j) => (beats(a, b) ? [{ a, b, from: points[i]!, to: points[j]! }] : [])));
  const half = NODE[variant] / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div role="group" aria-label={m.rps.choose} className="relative w-full max-w-[22rem]" style={{ aspectRatio: `100 / ${height}` }}>
        <svg viewBox={`0 0 100 ${height}`} aria-hidden className="absolute inset-0 size-full overflow-visible">
          {edges.map(({ a, b, from, to }) => {
            const color = focus === a ? PIECE_COLOR[me] : focus === b ? PIECE_COLOR[rival] : "var(--muted)";
            const lit = focus === a || focus === b;
            return (
              <Arrow
                key={`${a}-${b}`}
                from={from}
                to={to}
                gap={half + 1.5}
                color={color}
                width={lit ? 1.4 : 0.8}
                opacity={focus && !lit ? 0.18 : lit ? 1 : 0.55}
              />
            );
          })}
        </svg>

        {wheel.map((choice, i) => {
          const index = CHOICES[variant].indexOf(choice as never);
          const selected = picked === index;
          return (
            <button
              key={choice}
              type="button"
              aria-disabled={!canChoose}
              aria-pressed={selected}
              onClick={() => canChoose && onChoose(index)}
              onPointerEnter={() => setHovered(choice)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(choice)}
              onBlur={() => setHovered(null)}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface transition-[transform,box-shadow,opacity] ${
                selected
                  ? "ring-2 ring-ink"
                  : canChoose
                    ? "shadow-soft hover:-translate-y-[calc(50%+2px)] hover:shadow-lift"
                    : "cursor-default opacity-50"
              }`}
              style={{
                left: `${points[i]!.x}%`,
                top: `${(points[i]!.y / height) * 100}%`,
                width: `${NODE[variant]}%`,
                height: `${(NODE[variant] / height) * 100}%`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={choiceSrc(choice, me)} alt="" draggable={false} className="size-[62%]" />
              <span className="text-[11px] font-medium sm:text-xs">{m.rps.choices[choice]}</span>
            </button>
          );
        })}
      </div>

      {/* Alto fijo (dos frases por mano, o cuatro con lagarto y Spock) para que nada salte al pasar el ratón. */}
      <div aria-live="polite" className={`flex flex-col items-center justify-center gap-0.5 text-center text-sm ${variant === "rps" ? "min-h-11" : "min-h-22"}`}>
        {focus ? (
          <>
            {wheel.filter((b) => beats(focus, b)).map((b) => (
              <p key={b} style={{ color: PIECE_COLOR[me] }}>
                {(m.rps.beats[focus] as Partial<Record<Choice, string>>)[b]}
              </p>
            ))}
            {wheel.filter((a) => beats(a, focus)).map((a) => (
              <p key={a} style={{ color: PIECE_COLOR[rival] }}>
                {(m.rps.beats[a] as Partial<Record<Choice, string>>)[focus]}
              </p>
            ))}
          </>
        ) : (
          <p className="text-muted">{m.rps.arrowsHint}</p>
        )}
      </div>
    </div>
  );
}

/** Flecha de una mano a otra, sin meterse bajo las tarjetas (que son cuadradas). */
function Arrow({
  from,
  to,
  gap,
  color,
  width,
  opacity,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  gap: number;
  color: string;
  width: number;
  opacity: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  // Del centro al borde de un cuadrado en esa dirección.
  const edge = gap / Math.max(Math.abs(ux), Math.abs(uy));
  const start = { x: from.x + ux * edge, y: from.y + uy * edge };
  const tip = { x: to.x - ux * edge, y: to.y - uy * edge };
  const head = 2.2 + width;
  const base = { x: tip.x - ux * head, y: tip.y - uy * head };
  const wing = head * 0.6;
  return (
    <g opacity={opacity} style={{ transition: "opacity 150ms" }}>
      <line x1={start.x} y1={start.y} x2={base.x} y2={base.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon
        points={`${tip.x},${tip.y} ${base.x - uy * wing},${base.y + ux * wing} ${base.x + uy * wing},${base.y - ux * wing}`}
        fill={color}
      />
    </g>
  );
}
