import { createRng, nextInt, nextFloat, type RngState } from "@repo/games";

/**
 * Monstruos procedurales: SVG plano y geométrico, legible a 24 px.
 *
 * Cada monstruo es una combinación de partes identificadas por id. La semilla
 * del perfil elige las partes y `avatar_parts` (jsonb) guarda solo las que el
 * usuario ha cambiado a mano. Las partes `supporter` y las de logro
 * (`achievement`) nunca salen al azar.
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
  /**
   * Degradados que usa `body` (url(#...)). Los ids son fijos: el mismo degradado
   * en todos los SVG. En coordenadas del dibujo (userSpaceOnUse), para que un
   * cuerpo hecho de varias formas (fluffy) lo comparta en vez de repetirlo en cada una.
   */
  defs?: string;
  supporter?: boolean;
  /** Id del logro que la desbloquea. */
  achievement?: string;
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
  rainbow: {
    body: "url(#brb-rainbow)",
    shade: "#845ef7",
    accent: "#ffffff",
    supporter: true,
    defs: `<linearGradient id="brb-rainbow" gradientUnits="userSpaceOnUse" x1="15" y1="15" x2="85" y2="95"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".25" stop-color="#ffd43b"/><stop offset=".5" stop-color="#8ce99a"/><stop offset=".75" stop-color="#3bc9db"/><stop offset="1" stop-color="#845ef7"/></linearGradient>`,
  },
  galaxy: {
    body: "url(#brb-galaxy)",
    shade: "#2b1a5e",
    accent: "#ffd43b",
    supporter: true,
    defs: `<radialGradient id="brb-galaxy" gradientUnits="userSpaceOnUse" cx="38" cy="38" r="70"><stop offset="0" stop-color="#b197fc"/><stop offset=".45" stop-color="#5f3dc4"/><stop offset="1" stop-color="#1c1340"/></radialGradient>`,
  },
  ember: { body: "#ff7a45", shade: "#e8590c", accent: "#ffd43b", achievement: "streak-30" },
  ultra: { body: "#845ef7", shade: "#6741d9", accent: "#ffd43b", achievement: "tile-2048" },
  ice: { body: "#a5e8f2", shade: "#66c5d9", accent: "#4c6ef5", achievement: "minesweeper-hard" },
  jungle: { body: "#40c057", shade: "#2b8a3e", accent: "#ffe066", achievement: "snake-30" },
  terminal: { body: "#1f2a24", shade: "#69db7c", accent: "#69db7c", achievement: "contributor" },
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
  /** back: detrás del cuerpo; front: encima del cuerpo; face: encima de la cara (gafas…). */
  layer: "back" | "front" | "face";
  /** `eyes`: qué ojos lleva (las gafas se adaptan a uno, dos o tres). */
  draw: (body: Body, palette: Palette, eyes: EyesId) => string;
  supporter?: boolean;
  /** Id del logro que la desbloquea. */
  achievement?: string;
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
  sunglasses: {
    layer: "face",
    supporter: true,
    draw: (b, _p, eyes) => {
      const { x, y } = b.eyes;
      const lens = (cx: number, cy: number, w: number, h: number) =>
        `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2.4}" fill="${INK}"/>` +
        `<path d="M${cx - w / 2 + 3} ${cy - h / 2 + 3.5}l${Math.max(3, w / 4)} 0" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
      const bridge = (from: number, to: number, at: number) =>
        `<path d="M${from} ${at}H${to}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
      // Un cristal por ojo, del tamaño de cada uno (ver EYES).
      if (eyes === "cyclops") return bridge(x - 26, x + 26, y - 4) + lens(x, y - 2, 36, 31);
      if (eyes === "three")
        return bridge(x - 26, x + 26, y - 3) + lens(x - 16, y + 1, 16, 16) + lens(x, y - 8, 17, 17) + lens(x + 16, y + 1, 16, 16);
      if (eyes === "odd") return bridge(x - 26, x + 24, y - 3) + lens(x - 12, y - 1, 26, 25) + lens(x + 14, y + 1, 18, 17);
      return bridge(x - 25, x + 25, y - 4) + lens(x - 13, y, 22, 20) + lens(x + 13, y, 22, 20);
    },
  },
  cap: {
    layer: "front",
    achievement: "first-run",
    draw: (b) =>
      `<path d="M31 ${b.top + 9}a19 16 0 0 1 38 0z" fill="#ff6b6b"/>` +
      `<path d="M58 ${b.top + 5}h18a3 3 0 0 1 0 6h-18z" fill="#e03131"/>` +
      `<circle cx="50" cy="${b.top - 7}" r="2.6" fill="#e03131"/>`,
  },
  headphones: {
    layer: "front",
    achievement: "friends-3",
    draw: (b) => {
      const r = b.spread + 12;
      return (
        `<path d="M${50 - r} ${b.top + 20}a${r} ${r} 0 0 1 ${2 * r} 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        mirrored({ ...b, spread: r }, (x) => `<rect x="${x - 5.5}" y="${b.top + 13}" width="11" height="17" rx="5" fill="#3bc9db" stroke="${INK}" stroke-width="2.5"/>`)
      );
    },
  },
  flower: {
    layer: "front",
    achievement: "streak-7",
    draw: (b) => {
      const cx = 50 + b.spread * 0.8;
      const cy = b.top + 3;
      const petals = [0, 72, 144, 216, 288]
        .map((deg) => {
          const a = (deg * Math.PI) / 180;
          return `<circle cx="${(cx + Math.cos(a) * 5).toFixed(1)}" cy="${(cy + Math.sin(a) * 5).toFixed(1)}" r="4.2"/>`;
        })
        .join("");
      return `<g fill="#ff8fc0">${petals}</g><circle cx="${cx}" cy="${cy}" r="3.2" fill="#ffd43b"/>`;
    },
  },
  bow: {
    layer: "front",
    achievement: "wordle-3",
    draw: (b) => {
      const cx = 50 - b.spread * 0.7;
      const cy = b.top + 4;
      return (
        `<path d="M${cx} ${cy}l-10-6v12zM${cx} ${cy}l10-6v12z" fill="#ff6b8a" stroke="#e64980" stroke-width="2" stroke-linejoin="round"/>` +
        `<circle cx="${cx}" cy="${cy}" r="3" fill="#e64980"/>`
      );
    },
  },
  halo: {
    layer: "back",
    achievement: "lightsout-10",
    draw: (b) => `<ellipse cx="50" cy="${b.top - 7}" rx="16" ry="4.5" fill="none" stroke="#ffd43b" stroke-width="3.5"/>`,
  },
  wizard: {
    layer: "front",
    achievement: "sudoku-hard",
    draw: (b) =>
      `<path d="M35 ${b.top + 8}L53 ${b.top - 15}L65 ${b.top + 8}z" fill="#5f3dc4"/>` +
      `<ellipse cx="50" cy="${b.top + 8}" rx="22" ry="4.5" fill="#4527a0"/>` +
      `<path d="M51.5 ${b.top - 6}l1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="#ffd43b"/>`,
  },
  party: {
    layer: "front",
    achievement: "winner-5",
    draw: (b) =>
      `<path d="M40 ${b.top + 7}L50 ${b.top - 12}L60 ${b.top + 7}z" fill="#3bc9db"/>` +
      `<circle cx="48" cy="${b.top - 1}" r="1.8" fill="#ff6b6b"/><circle cx="53" cy="${b.top + 3}" r="1.8" fill="#ffd43b"/>` +
      `<circle cx="50" cy="${b.top - 13}" r="3.3" fill="#ff6b6b"/>`,
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

/** Logro que desbloquea esa parte, o null si es libre (o de supporter). */
export function partAchievement(slot: "palette" | "top", id: string): string | null {
  const catalog = (slot === "palette" ? PALETTES : TOPS) as Record<string, { achievement?: string }>;
  return catalog[id]?.achievement ?? null;
}

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

function pick<T extends string>(rng: RngState, ids: T[]): [T, RngState] {
  const [index, next] = nextInt(rng, ids.length);
  return [ids[index]!, next];
}

const freePalettes = PART_OPTIONS.palette.filter((id) => !isSupporterPart("palette", id) && !partAchievement("palette", id));
const freeTops = PART_OPTIONS.top.filter((id) => !isSupporterPart("top", id) && !partAchievement("top", id));

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
    (palette.defs ? `<defs>${palette.defs}</defs>` : "") +
    (top.layer === "back" ? top.draw(body, palette, parts.eyes) : "") +
    body.shape(palette.body) +
    (top.layer === "front" ? top.draw(body, palette, parts.eyes) : "") +
    cheeks +
    `<g class="monster-eyes" style="transform-origin:${x}px ${y}px">${eyes}</g>` +
    brows +
    mouth +
    (top.layer === "face" ? top.draw(body, palette, parts.eyes) : "") +
    `</svg>`
  );
}

function sadMouth(y: number): string {
  return `<path d="M41 ${y + 5}q9-8 18 0" ${stroke}/>`;
}

// ---------------------------------------------------------------------------
// Stickers: el monstruo con una expresión, para el chat
// ---------------------------------------------------------------------------

export const STICKERS = ["laugh", "cry", "sad", "angry", "love", "shock"] as const;
export type Sticker = (typeof STICKERS)[number];

const TEAR = "#6cc6ff";

/** Lágrima con la punta arriba en (x, y) y alto `h`. */
function tear(x: number, y: number, h: number): string {
  const w = h * 0.42;
  return `<path d="M${x} ${y}c${w} ${h * 0.45} ${w} ${h * 0.75} 0 ${h}c${-w} ${-h * 0.25} ${-w} ${-h * 0.55} 0 ${-h}z" fill="${TEAR}"/>`;
}

function heart(x: number, y: number, r: number): string {
  return `<path d="M${x} ${y + r * 0.9}c${-r * 1.5} ${-r} ${-r * 1.3} ${-r * 2.1} ${-r * 0.5} ${-r * 2.1}c${r * 0.3} 0 ${r * 0.5} ${r * 0.3} ${r * 0.5} ${r * 0.5}c0 ${-r * 0.2} ${r * 0.2} ${-r * 0.5} ${r * 0.5} ${-r * 0.5}c${r * 0.8} 0 ${r} ${r * 1.1} ${-r * 0.5} ${r * 2.1}z" fill="#ff4d6d"/>`;
}

/** Cara de cada sticker: ojos, boca y extras, sobre el punto de los ojos y la altura de la boca. */
const STICKER_FACES: Record<Sticker, (eyes: Point, mouthY: number, parts: MonsterParts) => string> = {
  laugh: ({ x, y }, m) =>
    EYES.joy({ x, y }) +
    `<path d="M37 ${m - 3}h26q0 15-13 15t-13-15z" fill="${INK}"/>` +
    `<path d="M44 ${m + 7}q6-4 12 0q-2 5-6 5t-6-5z" fill="${BLUSH}"/>` +
    tear(x - 24, y + 1, 9) +
    tear(x + 24, y + 1, 9),
  cry: ({ x, y }, m) =>
    `<path d="M${x - 19} ${y}q6 4 12 0M${x + 7} ${y}q6 4 12 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<path d="M${x - 13} ${y + 4}V${m + 14}M${x + 13} ${y + 4}V${m + 14}" stroke="${TEAR}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M38 ${m + 8}q12-16 24 0z" fill="${INK}"/>`,
  sad: (eyes, m, parts) =>
    EYES[parts.eyes](eyes) +
    `<path d="M${eyes.x - 21} ${eyes.y - 13}l12-5M${eyes.x + 21} ${eyes.y - 13}l-12-5" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` +
    sadMouth(m) +
    tear(eyes.x + 15, eyes.y + 9, 8),
  angry: (eyes, m, parts) =>
    EYES[parts.eyes](eyes) +
    `<path d="M${eyes.x - 22} ${eyes.y - 17}l13 6M${eyes.x + 22} ${eyes.y - 17}l-13 6" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<path d="M40 ${m + 5}q10-7 20 0" ${stroke}/>` +
    `<path d="M73 22q3 4 7 1M77 18q-1 5 3 7" stroke="#e03131" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  love: ({ x, y }, m) => heart(x - 13, y, 7) + heart(x + 13, y, 7) + MOUTHS.smile(m),
  shock: ({ x, y }, m) =>
    `<circle cx="${x - 13}" cy="${y}" r="10" fill="${WHITE}"/><circle cx="${x + 13}" cy="${y}" r="10" fill="${WHITE}"/>` +
    `<circle cx="${x - 13}" cy="${y}" r="2.6" fill="${INK}"/><circle cx="${x + 13}" cy="${y}" r="2.6" fill="${INK}"/>` +
    `<path d="M${x - 21} ${y - 16}q8-5 16 0M${x + 5} ${y - 16}q8-5 16 0" ${stroke}/>` +
    `<ellipse cx="50" cy="${m + 4}" rx="6" ry="8.5" fill="${INK}"/>`,
};

/** SVG de un sticker: el monstruo de esa persona con la expresión. */
export function renderStickerSvg(parts: MonsterParts, sticker: Sticker): string {
  const body: Body = BODIES[parts.body];
  const palette: Palette = PALETTES[parts.palette];
  const top: Top = TOPS[parts.top];
  const { x } = body.eyes;
  const blush =
    sticker === "laugh" || sticker === "love" || sticker === "angry"
      ? `<g fill="${sticker === "angry" ? "#ff4d4d" : BLUSH}" opacity=".5"><ellipse cx="${x - 22}" cy="${body.mouthY - 4}" rx="6" ry="4"/><ellipse cx="${x + 22}" cy="${body.mouthY - 4}" rx="6" ry="4"/></g>`
      : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    (palette.defs ? `<defs>${palette.defs}</defs>` : "") +
    (top.layer === "back" ? top.draw(body, palette, parts.eyes) : "") +
    body.shape(palette.body) +
    (top.layer === "front" ? top.draw(body, palette, parts.eyes) : "") +
    blush +
    STICKER_FACES[sticker](body.eyes, body.mouthY, parts) +
    (top.layer === "face" ? top.draw(body, palette, parts.eyes) : "") +
    `</svg>`
  );
}
