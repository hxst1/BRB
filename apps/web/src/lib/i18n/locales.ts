/** Idiomas de la app. El primero es el de por defecto. */
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Cookie con el idioma elegido en Ajustes (si no hay, se usa el del navegador). */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** El elegido en Ajustes o, si no hay, el del navegador: inglés si lo prefiere antes que el español. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (lang === "es") return "es";
    if (lang === "en") return "en";
  }
  return "es";
}
