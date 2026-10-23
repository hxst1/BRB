"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { messagesFor, type Messages } from "./index";
import type { Locale } from "./locales";

const LocaleContext = createContext<Locale>("es");

/** Idioma para los componentes de cliente (lo pone el layout, que lo lee de la petición). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Textos del idioma actual. */
export function useMessages(): Messages {
  return messagesFor(useLocale());
}

/** La ruta de la página sin el prefijo de idioma (/en/sudoku → /sudoku), para comparar rutas. */
export function usePagePath(): string {
  const pathname = usePathname();
  return pathname === "/en" ? "/" : pathname.startsWith("/en/") ? pathname.slice(3) : pathname;
}
