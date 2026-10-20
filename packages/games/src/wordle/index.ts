/**
 * Wordle: adivinar una palabra de 5 letras en 6 intentos. Cada intento se
 * marca letra a letra: en su sitio (verde), está pero en otro sitio
 * (amarillo) o no está (gris).
 *
 * La palabra secreta nunca llega al cliente: el servidor puntúa cada intento
 * con `scoreGuess` y solo devuelve el patrón de colores.
 */

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** g = en su sitio, y = en otro sitio, b = no está. */
export type Mark = "g" | "y" | "b";
/** Patrón de un intento, p. ej. "gybbg". */
export type Pattern = string;

export const SOLVED: Pattern = "g".repeat(WORD_LENGTH);

/** Minúsculas y sin tildes ni diéresis; la ñ se conserva como letra propia. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/ñ/g, "\0")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\0/g, "ñ");
}

export function isWellFormed(word: string): boolean {
  return /^[a-zñ]{5}$/.test(word);
}

/**
 * Colores de un intento. Las letras repetidas cuentan como en el original:
 * primero se marcan las que están en su sitio y luego, de izquierda a
 * derecha, las amarillas mientras queden apariciones sin usar en la solución.
 */
export function scoreGuess(guess: string, answer: string): Pattern {
  const marks: Mark[] = Array(WORD_LENGTH).fill("b");
  const left = new Map<string, number>();
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "g";
    else left.set(answer[i]!, (left.get(answer[i]!) ?? 0) + 1);
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "g") continue;
    const count = left.get(guess[i]!) ?? 0;
    if (count > 0) {
      marks[i] = "y";
      left.set(guess[i]!, count - 1);
    }
  }
  return marks.join("");
}

/** Lo mejor que se sabe de cada letra tras los intentos (para colorear el teclado). */
export function letterHints(guesses: string[], patterns: Pattern[]): Map<string, Mark> {
  const rank: Record<Mark, number> = { b: 0, y: 1, g: 2 };
  const hints = new Map<string, Mark>();
  guesses.forEach((guess, row) => {
    [...guess].forEach((letter, i) => {
      const mark = patterns[row]![i] as Mark;
      const known = hints.get(letter);
      if (!known || rank[mark] > rank[known]) hints.set(letter, mark);
    });
  });
  return hints;
}

const EMOJI: Record<Mark, string> = { g: "🟩", y: "🟨", b: "⬛" };

/** Cuadrícula de colores para compartir el resultado sin desvelar la palabra. */
export function shareGrid(patterns: Pattern[]): string {
  return patterns.map((pattern) => [...pattern].map((mark) => EMOJI[mark as Mark]).join("")).join("\n");
}
