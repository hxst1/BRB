import { createRng, nextFloat, nextInt, type RngState } from "../rng";

/**
 * Órbitas: anillos concéntricos que giran, cada uno con un hueco. Se lanza una
 * bola desde abajo hacia el centro y tiene que cruzarlos todos por su hueco.
 * Cada nivel superado suma un punto; chocar quita una vida y se repite el nivel.
 *
 * Va por tics, como el Snake: la partida queda registrada como los tics en que
 * se lanzó, así que se puede repetir entera a partir de la semilla (los niveles
 * salen del rng) y validar en el servidor.
 *
 * Los ángulos van en décimas de grado (0-3599), en sentido horario desde la
 * derecha, como en el canvas; las distancias, en milésimas del radio del tablero.
 */

export const TICK_MS = 16;
export const LIVES = 3;
export const FULL_TURN = 3600;
/** Por dónde entra la bola: abajo. */
export const LAUNCH_ANGLE = 900;
export const START_RADIUS = 640;
export const CORE_RADIUS = 120;
export const BALL_RADIUS = 30;
export const RING_WIDTH = 36;
/** Lo que avanza la bola hacia el centro en cada tic. */
export const BALL_SPEED = 22;
/** Tics de pausa tras chocar o superar un nivel, antes de poder lanzar otra vez. */
export const PAUSE_TICKS = 50;

/** Los anillos van pegados, de dentro afuera: el primero a esta distancia y cada uno a SPACING del anterior. */
const INNER_RING = 300;
const RING_SPACING = 54;

export interface Ring {
  radius: number;
  /** Décimas de grado por tic; negativo, en sentido antihorario. */
  speed: number;
  /** Ángulo del centro del hueco al empezar el nivel. */
  phase: number;
  /** Ancho del hueco. */
  gap: number;
  /** Si no es 0, cada cuántos tics cambia de sentido. */
  flip: number;
}

export type Status = "aim" | "flying" | "crashed" | "cleared" | "over";

export interface OrbitsState {
  seed: number;
  rng: RngState;
  level: number;
  lives: number;
  rings: Ring[];
  /** Tic en que empezó el nivel: los anillos giran desde ahí. */
  levelStart: number;
  tick: number;
  status: Status;
  /** Hasta qué tic dura la pausa tras chocar o superar el nivel. */
  until: number;
  /** Distancia de la bola al centro. */
  ball: number;
  /** Anillo contra el que ha chocado. */
  hit: number | null;
  /** Niveles superados: la puntuación. */
  score: number;
  /** Lanzamientos, codificados (ver decodeLaunches). */
  launches: string;
  lastLaunchTick: number;
}

const mod = (value: number, by: number) => ((value % by) + by) % by;

/** Ángulo del centro del hueco `t` tics después de empezar el nivel (admite fracciones, para dibujar). */
export function ringAngle(ring: Ring, t: number): number {
  let travel = t;
  if (ring.flip > 0) {
    // Va y vuelve: a ratos avanza y a ratos deshace lo andado.
    const rest = t % ring.flip;
    travel = Math.floor(t / ring.flip) % 2 === 0 ? rest : ring.flip - rest;
  }
  return mod(ring.phase + ring.speed * travel, FULL_TURN);
}

/** Lo que ocupa la bola, en ángulo, al cruzar un anillo de ese radio. */
function ballMargin(radius: number): number {
  return Math.ceil(((BALL_RADIUS / radius) * FULL_TURN) / (2 * Math.PI));
}

/** ¿La bola cabe por el hueco del anillo en el tic `t` del nivel? */
export function fitsGap(ring: Ring, t: number): boolean {
  const offset = Math.abs(mod(ringAngle(ring, t) - LAUNCH_ANGLE + FULL_TURN / 2, FULL_TURN) - FULL_TURN / 2);
  return offset <= ring.gap / 2 - ballMargin(ring.radius);
}

type Advance = { hit: number } | { ball: number };

/** Un tic de vuelo: la bola avanza y, si cruza un anillo fuera del hueco, choca. */
function advance(rings: Ring[], ball: number, t: number): Advance {
  const next = ball - BALL_SPEED;
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i]!;
    if (ball > ring.radius && next <= ring.radius && !fitsGap(ring, t)) return { hit: i };
  }
  return { ball: next };
}

/** ¿Una bola lanzada en el tic `t` del nivel llega al centro? */
export function wouldClear(rings: Ring[], t: number): boolean {
  let ball = START_RADIUS;
  for (let tick = t; ball > CORE_RADIUS; tick++) {
    const result = advance(rings, ball, tick);
    if ("hit" in result) return false;
    ball = result.ball;
  }
  return true;
}

/** Tic del vuelo (contando desde el lanzamiento) en que la bola cruza un anillo de ese radio. */
function crossingTick(radius: number): number {
  return Math.ceil((START_RADIUS - radius) / BALL_SPEED) - 1;
}

/**
 * Cada cuántos tics se repite el nivel entero, según se sube: todos los anillos
 * dan un número exacto de vueltas (o de idas y vueltas) en ese tiempo. Son
 * divisores de una vuelta, para que las velocidades sean enteras.
 */
const PERIODS = [600, 450, 400, 360, 300, 240, 225, 200, 180];

/**
 * Anillos del nivel: más anillos, más rápidos y con huecos más estrechos según
 * se sube. Siempre tiene solución: se elige un tic en que lanzar pasa por todos
 * los huecos y se colocan los anillos para que así sea. Como el nivel se repite
 * cada periodo, ese momento vuelve cada pocos segundos.
 */
function makeRings(rng: RngState, level: number): [Ring[], RngState] {
  let state = rng;
  const random = () => {
    const [value, next] = nextFloat(state);
    state = next;
    return value;
  };
  const pick = <T>(options: T[]): T => {
    const [index, next] = nextInt(state, options.length);
    state = next;
    return options[index]!;
  };

  const count = Math.min(5, 1 + Math.floor(level / 2));
  const period = PERIODS[Math.min(level, PERIODS.length) - 1]!;
  const base = FULL_TURN / period;
  const multipliers = level < 4 ? [1] : level < 9 ? [1, 1, 2] : [1, 2, 2, 3];
  const gap = Math.max(450, 1000 - level * 45);
  const flips = [period / 2, period / 4, period / 6].filter((flip) => Number.isInteger(flip) && flip >= 30);
  const solution = Math.floor(random() * period);

  const rings: Ring[] = [];
  for (let i = 0; i < count; i++) {
    const radius = INNER_RING + (count - 1 - i) * RING_SPACING;
    const speed = base * pick(multipliers) * (random() < 0.5 ? -1 : 1);
    const width = Math.round(gap * (0.9 + random() * 0.2));
    const flip = level >= 6 && random() < 0.35 ? pick(flips) : 0;
    // En el tic en que la bola de la solución lo cruza, el hueco queda abajo
    // (no siempre centrado, para que no se note el truco).
    const slack = width / 2 - ballMargin(radius);
    const offset = Math.round((random() - 0.5) * slack);
    const ring: Ring = { radius, speed, phase: 0, gap: width, flip };
    ring.phase = mod(LAUNCH_ANGLE + offset - ringAngle(ring, solution + crossingTick(radius)), FULL_TURN);
    rings.push(ring);
  }
  return [rings, state];
}

/** Empieza el nivel `level` en el tic `tick`. */
function startLevel(state: OrbitsState, level: number, tick: number): OrbitsState {
  const [rings, rng] = makeRings(state.rng, level);
  return { ...state, rng, level, rings, levelStart: tick, status: "aim", ball: START_RADIUS, hit: null };
}

export function newGame(seed: number): OrbitsState {
  const state: OrbitsState = {
    seed,
    rng: createRng(seed),
    level: 1,
    lives: LIVES,
    rings: [],
    levelStart: 0,
    tick: 0,
    status: "aim",
    until: 0,
    ball: START_RADIUS,
    hit: null,
    score: 0,
    launches: "",
    lastLaunchTick: 0,
  };
  return startLevel(state, 1, 0);
}

/** ¿Se puede lanzar en el próximo tic? */
export function canLaunch(state: OrbitsState): boolean {
  if (state.status === "aim") return true;
  return (state.status === "crashed" || state.status === "cleared") && state.tick + 1 >= state.until;
}

/** Avanza un tic, lanzando antes si se indica (y se puede). */
export function step(state: OrbitsState, launch = false): OrbitsState {
  if (state.status === "over") return state;
  const tick = state.tick + 1;
  let next: OrbitsState = { ...state, tick };

  // Al acabar la pausa: el siguiente nivel, o el mismo otra vez tras chocar
  // (los anillos siguen girando donde iban, sin saltos).
  if (next.status === "crashed" || next.status === "cleared") {
    if (tick < next.until) return next;
    next =
      next.status === "cleared"
        ? startLevel(next, next.level + 1, tick)
        : { ...next, status: "aim", ball: START_RADIUS, hit: null };
  }

  if (next.status === "aim") {
    if (!launch) return next;
    next = { ...next, status: "flying", launches: next.launches + (next.launches ? "." : "") + (tick - next.lastLaunchTick), lastLaunchTick: tick };
  }

  const result = advance(next.rings, next.ball, tick - next.levelStart);
  if ("hit" in result) {
    const lives = next.lives - 1;
    const ring = next.rings[result.hit]!;
    return {
      ...next,
      lives,
      status: lives === 0 ? "over" : "crashed",
      until: tick + PAUSE_TICKS,
      ball: ring.radius + RING_WIDTH / 2 + BALL_RADIUS,
      hit: result.hit,
    };
  }
  if (result.ball <= CORE_RADIUS) {
    return { ...next, status: "cleared", until: tick + PAUSE_TICKS, ball: CORE_RADIUS, score: next.score + 1 };
  }
  return { ...next, ball: result.ball };
}

/** "34.80.12": tics desde el lanzamiento anterior (el primero, desde el principio). */
export function decodeLaunches(encoded: string): number[] | null {
  if (encoded === "") return [];
  const ticks: number[] = [];
  let tick = 0;
  for (const part of encoded.split(".")) {
    if (!/^[1-9]\d*$/.test(part)) return null;
    const gap = Number(part);
    if (!Number.isSafeInteger(gap)) return null;
    tick += gap;
    ticks.push(tick);
  }
  return ticks;
}

export type ReplayResult = { valid: true; state: OrbitsState; durationMs: number } | { valid: false; reason: string };

/** Límite de seguridad: más que las 6 horas que dura como mucho una partida. */
const MAX_TICKS = 1_500_000;

/**
 * Repite una partida desde la semilla con sus lanzamientos y la deja avanzar
 * hasta que se puede volver a lanzar (o se acaba). Devuelve también el tiempo
 * mínimo que dura (sus tics), para comprobar que no se ha jugado más rápido de lo posible.
 */
export function replay(seed: number, encoded: string): ReplayResult {
  const launches = decodeLaunches(encoded);
  if (!launches) return { valid: false, reason: "Lanzamientos mal codificados" };
  if (launches.length > 0 && launches[launches.length - 1]! > MAX_TICKS) return { valid: false, reason: "Partida demasiado larga" };

  let state = newGame(seed);
  for (const tick of launches) {
    while (state.tick < tick - 1) {
      if (state.status === "over") return { valid: false, reason: "Lanzamientos después de acabar" };
      state = step(state);
    }
    if (!canLaunch(state)) return { valid: false, reason: `Lanzamiento imposible en el tic ${tick}` };
    state = step(state, true);
  }
  while (state.status !== "over" && !canLaunch(state)) state = step(state);
  return { valid: true, state, durationMs: state.tick * TICK_MS };
}
