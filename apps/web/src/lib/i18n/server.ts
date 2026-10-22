import { lang } from "next/root-params";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { messagesFor } from "./index";
import { isLocale, LOCALE_COOKIE, pickLocale, type Locale } from "./locales";

/** Idioma de la página que se está generando (el segmento [lang] que rellena proxy.ts). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

/** Textos de la página que se está generando. */
export async function getMessages() {
  return messagesFor(await getLocale());
}

/**
 * Idioma en server actions y route handlers, donde no hay segmento [lang]: el
 * elegido en Ajustes o el del navegador, igual que en proxy.ts.
 */
export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
}

export async function getRequestMessages() {
  return messagesFor(await getRequestLocale());
}
