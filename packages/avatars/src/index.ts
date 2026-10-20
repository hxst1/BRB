import { createRng, nextInt, nextFloat, type RngState } from "@repo/games";

/**
 * Monstruos procedurales: SVG plano y geométrico, legible a 24 px.
 *
 * Cada monstruo es una combinación de partes identificadas por id. La semilla
 * del perfil elige las partes y `avatar_parts` (jsonb) guarda solo las que el
 * usuario ha cambiado a mano. Las partes `supporter` nunca salen al azar.
 */

const INK = "#1b1a22";
const WHITE = "#ffffff";
const BLUSH = "#ff6b8a";

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

type Point = { x: number; y: number };

interface Body {
  /** SVG del cuerpo con `{fill}` como color. */
  shape: (fill: string) => string;
  eyes: Point;
  mouthY: number;
  /** Punto superior del cuerpo y separación lateral para cuernos/orejas. */
  top: number;
  spread: number;
}

const BODIES = {
  round: {
    shape: (f) => `<circle cx="50" cy="58" r="36" fill="${f}"/>`,
    eyes: { x: 50, y: 52 },
    mouthY: 72,
    top: 22,
    spread: 20,
  },
  square: {
    shape: (f) => `<rect x="15" y="24" width="70" height="70" rx="24" fill="${f}"/>`,
    eyes: { x: 50, y: 52 },
    mouthY: 74,
    top: 24,
    spread: 22,
  },
  ghost: {
    shape: (f) =>
      `<path d="M15 58a35 35 0 0 1 70 0v32q-5.5 7-11.7 0t-11.6 0-11.7 0-11.6 0-11.7 0-11.7 0z" fill="${f}"/>`,
    eyes: { x: 50, y: 50 },
    mouthY: 69,
    top: 23,
    spread: 20,
  },
  bean: {
    shape: (f) => `<ellipse cx="50" cy="60" rx="31" ry="36" fill="${f}"/>`,
    eyes: { x: 50, y: 52 },
    mouthY: 73,
    top: 24,
    spread: 16,
  },
  mountain: {
    shape: (f) => `<path d="M50 20c13 0 41 57 38 66-3 9-73 9-76 0-3-9 25-66 38-66z" fill="${f}"/>`,
    eyes: { x: 50, y: 60 },
    mouthY: 78,
    top: 22,
    spread: 9,
  },
  fluffy: {
    shape: (f) =>
      `<g fill="${f}"><circle cx="50" cy="60" r="31"/>${[
        [24, 50],
        [76, 50],
        [31, 33],
        [69, 33],
        [50, 27],
        [22, 70],
        [78, 70],
        [33, 86],
        [67, 86],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12"/>`)
        .join("")}</g>`,
    eyes: { x: 50, y: 56 },
    mouthY: 74,
    top: 18,
    spread: 18,
  },
} satisfies Record<string, Body>;

interface Palette {
  body: string;
  shade: string;
  accent: string;
  supporter?: boolean;
}

const PALETTES = {
  coral: { body: "#ff8a73", shade: "#e2604a", accent: "#ffd8b0" },
  amber: { body: "#ffc94a", shade: "#e89d1c", accent: "#ff7a59" },
  mint: { body: "#7edda0", shade: "#46b878", accent: "#f8f3df" },
  teal: { body: "#3cc5d5", shade: "#1f97a8", accent: "#ffe08a" },
  violet: { body: "#9b7bf7", shade: "#7155d8", accent: "#ffb8d4" },
  pink: { body: "#ff8fc0", shade: "#e5609b", accent: "#8bd3ff" },
  sky: { body: "#6fa8ff", shade: "#4680e0", accent: "#ffd36e" },
  lime: { body: "#b8e05a", shade: "#8cb932", accent: "#7a5af8" },
  gold: { body: "#f5c84c", shade: "#c99a1c", accent: "#fff4c7", supporter: true },
  night: { body: "#434866", shade: "#2c3048", accent: "#ff7ab6", supporter: true },
} satisfies Record<string, Palette>;

type EyeDrawer = (at: Point) => string;

function eye(x: number, y: number, r: number): string {
  const pupil = r * 0.5;
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${WHITE}"/>` +
    `<circle cx="${x}" cy="${y + r * 0.15}" r="${pupil}" fill="${INK}"/>` +
    `<circle cx="${x - pupil * 0.35}" cy="${y - pupil * 0.2}" r="${Math.max(1.2, pupil * 0.32)}" fill="${WHITE}"/>`
  );
}

const EYES = {
  two: ({ x, y }) => eye(x - 13, y, 9) + eye(x + 13, y, 9),
  cyclops: ({ x, y }) => eye(x, y - 2, 14),
  three: ({ x, y }) => eye(x - 16, y + 1, 6.5) + eye(x, y - 8, 7) + eye(x + 16, y + 1, 6.5),
  odd: ({ x, y }) => eye(x - 12, y - 1, 11) + eye(x + 14, y + 1, 7),
  dots: ({ x, y }) =>
    `<circle cx="${x - 12}" cy="${y}" r="4.5" fill="${INK}"/><circle cx="${x + 12}" cy="${y}" r="4.5" fill="${INK}"/>`,
  joy: ({ x, y }) =>
    `<path d="M${x - 19} ${y + 3}q6-9 12 0M${x + 7} ${y + 3}q6-9 12 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
} satisfies Record<string, EyeDrawer>;

const stroke = `stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;

type MouthDrawer = (y: number) => string;

const MOUTHS = {
  smile: (y) => `<path d="M40 ${y}q10 9 20 0" ${stroke}/>`,
  fangs: (y) =>
    `<path d="M38 ${y}q12 13 24 0z" fill="${INK}"/>` +
    `<path d="M41 ${y}l2.5 5 2.5-5zM54 ${y}l2.5 5 2.5-5z" fill="${WHITE}"/>`,
  oh: (y) => `<ellipse cx="50" cy="${y + 2}" rx="5" ry="6" fill="${INK}"/>`,
  wobbly: (y) => `<path d="M39 ${y + 1}q3.7-4 7.3 0t7.4 0 7.3 0" ${stroke}/>`,
  tongue: (y) =>
    `<path d="M39 ${y}q11 14 22 0z" fill="${INK}"/>` +
    `<path d="M45.5 ${y + 4.5}q4.5-3 9 0q0 6-4.5 6t-4.5-6z" fill="${BLUSH}"/>`,
  teeth: (y) =>
    `<rect x="36" y="${y - 3}" width="28" height="11" rx="5.5" fill="${INK}"/>` +
    `<path d="M39 ${y - 3}h22l-2.75 4.5-2.75-4.5-2.75 4.5-2.75-4.5-2.75 4.5-2.75-4.5-2.75 4.5z" fill="${WHITE}"/>`,
} satisfies Record<string, MouthDrawer>;

interface Top {
  layer: "back" | "front";
  draw: (body: Body, palette: Palette) => string;
  supporter?: boolean;
}

function mirrored(body: Body, draw: (x: number, side: 1 | -1) => string): string {
  return draw(50 - body.spread, -1) + draw(50 + body.spread, 1);
}

const TOPS = {
  none: { layer: "back", draw: () => "" },
  horns: {
    layer: "back",
    draw: (b, p) =>
      mirrored(
        b,
        (x, s) =>
          `<path d="M${x - 6 * s} ${b.top + 8}q${-5 * s}-16 ${4 * s}-22q${-1 * s} 10 ${8 * s} 20z" fill="${p.accent}"/>`,
      ),
  },
  antenna: {
    layer: "back",
    draw: (b, p) =>
      `<path d="M50 ${b.top + 4}q-2-9 4-15" stroke="${p.shade}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="54" cy="${b.top - 12}" r="5.5" fill="${p.accent}"/>`,
  },
  ears: {
    layer: "back",
    draw: (b, p) =>
      mirrored(
        b,
        (x) =>
          `<circle cx="${x}" cy="${b.top + 5}" r="10" fill="${p.body}"/>` +
          `<circle cx="${x}" cy="${b.top + 5}" r="5" fill="${p.accent}"/>`,
      ),
  },
  spikes: {
    layer: "back",
    draw: (b, p) =>
      [-12, 0, 12]
        .map((dx, i) => {
          const h = i === 1 ? 15 : 11;
          return `<path d="M${50 + dx - 6} ${b.top + 6}l6 ${-h} 6 ${h}z" fill="${p.accent}" stroke="${p.accent}" stroke-width="3" stroke-linejoin="round"/>`;
        })
        .join(""),
  },
  tuft: {
    layer: "front",
    draw: (b, p) =>
      `<path d="M50 ${b.top + 3}q-1-8-7-11M50 ${b.top + 3}q0-9 2-13M50 ${b.top + 3}q2-7 8-9" stroke="${p.shade}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  crown: {
    layer: "front",
    supporter: true,
    draw: (b) =>
      `<path d="M37 ${b.top + 4}l-2-14 8 7 7-10 7 10 8-7-2 14z" fill="#ffd43b" stroke="#e8a90c" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="${b.top - 2}" r="2.3" fill="#ff6b8a"/>`,
  },
} satisfies Record<string, Top>;

export type BodyId = keyof typeof BODIES;
export type PaletteId = keyof typeof PALETTES;
export type EyesId = keyof typeof EYES;
export type MouthId = keyof typeof MOUTHS;
export type TopId = keyof typeof TOPS;

export interface MonsterParts {
  body: BodyId;
  palette: PaletteId;
  eyes: EyesId;
  mouth: MouthId;
  top: TopId;
  cheeks: boolean;
}

/** Ids de cada ranura, para el editor de avatar. */
export const PART_OPTIONS = {
  body: Object.keys(BODIES) as BodyId[],
  palette: Object.keys(PALETTES) as PaletteId[],
  eyes: Object.keys(EYES) as EyesId[],
  mouth: Object.keys(MOUTHS) as MouthId[],
  top: Object.keys(TOPS) as TopId[],
};

export function isSupporterPart(slot: "palette" | "top", id: string): boolean {
  const catalog = (slot === "palette" ? PALETTES : TOPS) as Record<string, { supporter?: boolean }>;
  return catalog[id]?.supporter === true;
}

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

function pick<T extends string>(rng: RngState, ids: T[]): [T, RngState] {
  const [index, next] = nextInt(rng, ids.length);
  return [ids[index]!, next];
}

const freePalettes = PART_OPTIONS.palette.filter((id) => !isSupporterPart("palette", id));
const freeTops = PART_OPTIONS.top.filter((id) => !isSupporterPart("top", id));

export function monsterFromSeed(seed: number): MonsterParts {
  let rng = createRng(seed);
  let body: BodyId, palette: PaletteId, eyes: EyesId, mouth: MouthId, top: TopId, roll: number;
  [body, rng] = pick(rng, PART_OPTIONS.body);
  [palette, rng] = pick(rng, freePalettes);
  [eyes, rng] = pick(rng, PART_OPTIONS.eyes);
  [mouth, rng] = pick(rng, PART_OPTIONS.mouth);
  [top, rng] = pick(rng, freeTops);
  [roll, rng] = nextFloat(rng);
  return { body, palette, eyes, mouth, top, cheeks: roll < 0.4 };
}

/**
 * Valida lo que venga de `avatar_parts` (jsonb editable por el usuario):
 * descarta claves o ids desconocidos para que nunca lleguen al SVG.
 */
export function sanitizeParts(value: unknown): Partial<MonsterParts> {
  if (typeof value !== "object" || value === null) return {};
  const input = value as Record<string, unknown>;
  const result: Partial<MonsterParts> = {};
  for (const slot of ["body", "palette", "eyes", "mouth", "top"] as const) {
    const id = input[slot];
    if (typeof id === "string" && (PART_OPTIONS[slot] as string[]).includes(id)) {
      (result as Record<string, string>)[slot] = id;
    }
  }
  if (typeof input.cheeks === "boolean") result.cheeks = input.cheeks;
  return result;
}

/** Monstruo de un perfil: el de su semilla con los cambios manuales encima. */
export function resolveMonster(seed: number, overrides?: unknown): MonsterParts {
  return { ...monsterFromSeed(seed), ...sanitizeParts(overrides) };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export type Mood = "neutral" | "happy" | "sad";

/**
 * SVG del monstruo. Solo interpola valores del catálogo (nunca texto del
 * usuario), así que es seguro insertarlo como HTML.
 */
export function renderMonsterSvg(parts: MonsterParts, mood: Mood = "neutral"): string {
  const body: Body = BODIES[parts.body];
  const palette: Palette = PALETTES[parts.palette];
  const top: Top = TOPS[parts.top];
  const { x, y } = body.eyes;

  const eyes = mood === "happy" ? EYES.joy(body.eyes) : EYES[parts.eyes](body.eyes);
  const mouth =
    mood === "happy"
      ? MOUTHS.tongue(body.mouthY)
      : mood === "sad"
        ? sadMouth(body.mouthY)
        : MOUTHS[parts.mouth](body.mouthY);
  const brows =
    mood === "sad"
      ? `<path d="M${x - 21} ${y - 13}l12-5M${x + 21} ${y - 13}l-12-5" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
      : "";
  const cheeks =
    parts.cheeks || mood === "happy"
      ? `<g fill="${BLUSH}" opacity=".45"><ellipse cx="${x - 22}" cy="${body.mouthY - 4}" rx="5.5" ry="3.5"/><ellipse cx="${x + 22}" cy="${body.mouthY - 4}" rx="5.5" ry="3.5"/></g>`
      : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    (top.layer === "back" ? top.draw(body, palette) : "") +
    body.shape(palette.body) +
    (top.layer === "front" ? top.draw(body, palette) : "") +
    cheeks +
    `<g class="monster-eyes" style="transform-origin:${x}px ${y}px">${eyes}</g>` +
    brows +
    mouth +
    `</svg>`
  );
}

function sadMouth(y: number): string {
  return `<path d="M41 ${y + 5}q9-8 18 0" ${stroke}/>`;
}
