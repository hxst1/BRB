import { streakTier, type StreakTier } from "@/lib/streak";

/** Colores de cada tramo: fuera, dentro y el corazón de la llama. */
const COLORS: Record<StreakTier, { outer: string; inner: string; core: string }> = {
  out: { outer: "#adb5bd", inner: "#ced4da", core: "#e9ecef" },
  spark: { outer: "#ff922b", inner: "#ffc078", core: "#ffe066" },
  flame: { outer: "#fd7e14", inner: "#ffa94d", core: "#ffe066" },
  bonfire: { outer: "#f03e3e", inner: "#ff922b", core: "#ffd43b" },
  blue: { outer: "#1c7ed6", inner: "#4dabf7", core: "#d0ebff" },
  gold: { outer: "#f59f00", inner: "#ffd43b", core: "#fff9db" },
};

/** Tamaño de la llama en cada tramo: crece con la racha. */
const SCALE: Record<StreakTier, number> = { out: 0.62, spark: 0.66, flame: 0.8, bonfire: 0.92, blue: 1, gold: 1 };

const INK = "#15171c";
const OUTER = "M60 132C30 132 18 110 24 86C28 70 40 62 42 44C43 36 41 28 38 20C54 28 64 42 64 56C70 50 72 42 70 32C88 48 100 72 96 96C93 118 80 132 60 132Z";
const INNER = "M60 129C43 129 35 115 39 100C42 90 50 84 51 72C60 80 66 89 64 99C70 95 72 89 71 83C82 93 86 107 82 115C78 125 70 129 60 129Z";
/** Lenguas de fuego a los lados (desde la hoguera). */
const SIDE = "M30 128C18 126 14 112 20 100C22 106 26 108 28 106C26 98 28 90 34 84C34 96 40 102 40 112C40 122 36 128 30 128Z";

export type FlameMood = "happy" | "worried" | "asleep";

/**
 * La llama de la racha: una mascota con cara que crece y cambia de color por
 * tramos (lib/streak.ts) y arde (animaciones .flame-* de globals.css, quietas
 * con "reducir movimiento"). `mood`: contenta si hoy ya has jugado, preocupada
 * si la racha está en juego, dormida si está apagada.
 */
export function Flame({
  days,
  size = 120,
  mood = "happy",
  label,
  className,
}: {
  days: number;
  size?: number;
  mood?: FlameMood;
  label?: string;
  /** Para un tamaño que cambia con la pantalla (sustituye a `size`). */
  className?: string;
}) {
  const { tier } = streakTier(days);
  const color = COLORS[tier];
  const scale = SCALE[tier];
  const face = tier === "out" ? "asleep" : mood;

  return (
    <svg
      viewBox="0 0 120 140"
      width={className ? undefined : size}
      height={className ? undefined : (size * 140) / 120}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`shrink-0 overflow-visible ${className ?? ""}`}
    >
      {tier === "out" && (
        <g className="flame-smoke" fill="none" stroke="#ced4da" strokeWidth="4" strokeLinecap="round">
          <path d="M56 58c-6-8 6-12 0-20" />
          <path d="M68 50c-5-7 5-10 0-17" />
        </g>
      )}
      {tier === "gold" && (
        <g fill="#ffd43b" stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
          <path className="flame-spark" d="M18 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <path className="flame-spark flame-spark-2" d="M102 26l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" />
          <path className="flame-spark flame-spark-3" d="M106 78l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" />
        </g>
      )}
      <g transform={`translate(60 132) scale(${scale}) translate(-60 -132)`}>
        {(tier === "bonfire" || tier === "blue" || tier === "gold") && (
          <g className="flame-flicker" fill={color.outer} stroke={INK} strokeWidth="3" strokeLinejoin="round">
            <path d={SIDE} />
            <path d={SIDE} transform="translate(120 0) scale(-1 1)" />
          </g>
        )}
        <g className={tier === "out" ? undefined : "flame-sway"}>
          <path d={OUTER} fill={color.outer} stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />
          <path className={tier === "out" ? undefined : "flame-flicker"} d={INNER} fill={color.inner} />
          <ellipse cx="60" cy="118" rx="15" ry="9" fill={color.core} opacity=".9" />
          <Face mood={face} />
        </g>
        {tier === "bonfire" && (
          <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
            <rect x="28" y="126" width="64" height="11" rx="5.5" fill="#a9673a" transform="rotate(-8 60 131)" />
            <rect x="28" y="126" width="64" height="11" rx="5.5" fill="#c07a45" transform="rotate(8 60 131)" />
          </g>
        )}
      </g>
    </svg>
  );
}

function Face({ mood }: { mood: FlameMood }) {
  if (mood === "asleep") {
    return (
      <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round">
        <path d="M46 101q5 4 10 0M64 101q5 4 10 0" />
        <path d="M56 114h8" />
      </g>
    );
  }
  return (
    <g>
      <g className="flame-blink">
        <ellipse cx="50" cy="100" rx="4.6" ry="5.6" fill={INK} />
        <ellipse cx="70" cy="100" rx="4.6" ry="5.6" fill={INK} />
        <circle cx="51.6" cy="98" r="1.6" fill="#ffffff" />
        <circle cx="71.6" cy="98" r="1.6" fill="#ffffff" />
      </g>
      {mood === "worried" ? (
        <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
          <path d="M44 92l9-3.5M76 92l-9-3.5" />
          <ellipse cx="60" cy="114" rx="4" ry="3.4" fill={INK} stroke="none" />
        </g>
      ) : (
        <path d="M52 110q8 8 16 0" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      )}
    </g>
  );
}
