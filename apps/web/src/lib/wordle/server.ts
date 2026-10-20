import "server-only";
import { isWellFormed, normalizeWord } from "@repo/games/wordle";
import { createAdminClient } from "@/lib/supabase/admin";
import solutions from "./solutions.json";
import validWords from "./valid-words.json";

/**
 * Lo único que conoce las palabras del Wordle. Nunca se importa desde el
 * cliente: la palabra del día solo sale de aquí como colores.
 */

const VALID = new Set<string>(validWords);

/** Palabra de hoy (la elige la base de datos la primera vez que se pide en el día). */
export async function wordleToday(): Promise<{ day: string; word: string }> {
  const { data, error } = await createAdminClient().rpc("wordle_today", { candidates: solutions }).single();
  if (error || !data) throw new Error(`No se pudo obtener la palabra del día: ${error?.message}`);
  return data;
}

/** Normaliza el intento y dice si es una palabra aceptada. */
export function parseGuess(input: string): string | null {
  const word = normalizeWord(input.trim());
  return isWellFormed(word) && VALID.has(word) ? word : null;
}
