import "server-only";
import { isWellFormed, normalizeWord } from "@repo/games/wordle";
import type { Locale } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import solutionsEn from "./solutions-en.json";
import solutionsEs from "./solutions.json";
import validWordsEn from "./valid-words-en.json";
import validWordsEs from "./valid-words.json";

/**
 * Lo único que conoce las palabras del Wordle. Nunca se importa desde el
 * cliente: la palabra del día solo sale de aquí como colores. Hay una
 * palabra del día por idioma.
 */

const WORDS: Record<Locale, { solutions: string[]; valid: Set<string> }> = {
  es: { solutions: solutionsEs, valid: new Set(validWordsEs) },
  en: { solutions: solutionsEn, valid: new Set(validWordsEn) },
};

/** Palabra de hoy en ese idioma (la elige la base de datos la primera vez que se pide en el día). */
export async function wordleToday(lang: Locale): Promise<{ day: string; word: string }> {
  const { data, error } = await createAdminClient().rpc("wordle_today", { candidates: WORDS[lang].solutions, lang }).single();
  if (error || !data) throw new Error(`No se pudo obtener la palabra del día: ${error?.message}`);
  return data;
}

/** Normaliza el intento y dice si es una palabra aceptada en ese idioma. */
export function parseGuess(input: string, lang: Locale): string | null {
  const word = normalizeWord(input.trim());
  return isWellFormed(word) && WORDS[lang].valid.has(word) ? word : null;
}
