/** Idiomas de la app. El primero es el de por defecto. */
export const LOCALES = ["es", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

/** Cookie con el idioma elegido en Ajustes (si no hay, se usa el del navegador). */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** El elegido en Ajustes o, si no hay, el del navegador: el primero de los nuestros que prefiera. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return "es";
}

/**
 * Idiomas con contenido propio además de la interfaz: palabras del Wordle,
 * textos de la carrera de tecleo, novedades del panel y traducción de los
 * textos legales.
 */
export const CONTENT_LANGUAGES = ["es", "en"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

/**
 * En qué idioma va ese contenido para cada idioma de la app. El japonés aún no
 * tiene palabras del Wordle ni textos propios: usa los ingleses (el teclado
 * del Wordle y la carrera, en letras latinas).
 */
export function contentLanguage(locale: Locale): ContentLanguage {
  return locale === "ja" ? "en" : locale;
}

export function isContentLanguage(value: unknown): value is ContentLanguage {
  return typeof value === "string" && (CONTENT_LANGUAGES as readonly string[]).includes(value);
}
