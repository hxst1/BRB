/**
 * Piedra, papel o tijera (y la variante con lagarto y Spock).
 *
 * Los dos jugadores eligen a la vez, así que la partida solo guarda las rondas
 * ya resueltas: `moves` es la lista plana [x₀, o₀, x₁, o₁, …] con los índices
 * de lo que eligió cada uno. Las elecciones aún sin revelar las guarda el
 * servidor aparte, donde el rival no puede leerlas.
 */

export type Variant = "rps" | "rpsls";
export type Mark = "x" | "o";

export const CHOICES = {
  rps: ["rock", "paper", "scissors"],
  rpsls: ["rock", "paper", "scissors", "lizard", "spock"],
} as const;

export type Choice = (typeof CHOICES)["rpsls"][number];

export const CHOICE_NAMES: Record<Choice, string> = {
  rock: "Piedra",
  paper: "Papel",
  scissors: "Tijera",
  lizard: "Lagarto",
  spock: "Spock",
};

/** Qué vence a qué, y cómo lo cuenta Sheldon. */
const BEATS: Record<Choice, Partial<Record<Choice, string>>> = {
  rock: { scissors: "La piedra aplasta la tijera", lizard: "La piedra aplasta al lagarto" },
  paper: { rock: "El papel envuelve la piedra", spock: "El papel desautoriza a Spock" },
  scissors: { paper: "La tijera corta el papel", lizard: "La tijera decapita al lagarto" },
  lizard: { spock: "El lagarto envenena a Spock", paper: "El lagarto se come el papel" },
  spock: { scissors: "Spock rompe la tijera", rock: "Spock vaporiza la piedra" },
};

/** Gana quien llegue antes a estas rondas (al mejor de 3). */
export const WINS_NEEDED = 2;
/** Tope de rondas para que una racha de empates no dure para siempre. */
export const MAX_ROUNDS = 9;

export interface Round {
  x: Choice;
  o: Choice;
  winner: Mark | null;
  /** "La piedra aplasta la tijera", o null si empatan. */
  verdict: string | null;
}

export interface RpsState {
  variant: Variant;
  rounds: Round[];
  score: Record<Mark, number>;
  finished: boolean;
  /** Ganador de la partida; null si sigue o si acabó en empate por el tope de rondas. */
  winner: Mark | null;
}

export function isValidChoice(variant: Variant, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < CHOICES[variant].length;
}

export function resolveRound(variant: Variant, x: number, o: number): Round {
  const a = CHOICES[variant][x]!;
  const b = CHOICES[variant][o]!;
  if (a === b) return { x: a, o: b, winner: null, verdict: null };
  const xWins = BEATS[a][b];
  return xWins ? { x: a, o: b, winner: "x", verdict: xWins } : { x: a, o: b, winner: "o", verdict: BEATS[b][a]! };
}

/** Estado de la partida a partir de las rondas resueltas; null si algo no es válido. */
export function replay(variant: Variant, moves: readonly number[]): RpsState | null {
  if (moves.length % 2 !== 0 || moves.length / 2 > MAX_ROUNDS) return null;

  const rounds: Round[] = [];
  const score = { x: 0, o: 0 };
  for (let i = 0; i < moves.length; i += 2) {
    const [x, o] = [moves[i]!, moves[i + 1]!];
    if (!isValidChoice(variant, x) || !isValidChoice(variant, o)) return null;
    // No puede haber rondas después de que alguien haya ganado.
    if (score.x === WINS_NEEDED || score.o === WINS_NEEDED) return null;
    const round = resolveRound(variant, x, o);
    if (round.winner) score[round.winner]++;
    rounds.push(round);
  }

  const winner = score.x === WINS_NEEDED ? "x" : score.o === WINS_NEEDED ? "o" : null;
  const exhausted = rounds.length === MAX_ROUNDS;
  return {
    variant,
    rounds,
    score,
    finished: winner !== null || exhausted,
    winner: winner ?? (exhausted && score.x !== score.o ? (score.x > score.o ? "x" : "o") : null),
  };
}
