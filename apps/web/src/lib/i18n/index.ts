import { en } from "./en";
import { es } from "./es";
import type { Locale } from "./locales";

/**
 * Textos de la app. `es` es el original; `en` tiene que tener exactamente las
 * mismas claves (si falta una, no compila). Los que llevan datos son funciones.
 */
export type Messages = typeof es;

const MESSAGES: Record<Locale, Messages> = { es, en };

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}

export { LOCALES, type Locale } from "./locales";
