import { en } from "./en";
import { es } from "./es";
import { ja } from "./ja";
import type { Locale } from "./locales";

/**
 * Textos de la app. `es` es el original; `en` y `ja` tienen que tener
 * exactamente las mismas claves (si falta una, no compila; messages.test.ts lo
 * comprueba también en las listas). Los que llevan datos son funciones.
 */
export type Messages = typeof es;

const MESSAGES: Record<Locale, Messages> = { es, en, ja };

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}

export { LOCALES, type Locale } from "./locales";
