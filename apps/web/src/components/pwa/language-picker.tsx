"use client";

import { useLocale, useMessages } from "@/lib/i18n/client";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n/locales";

/** Idioma de la app. Se guarda en una cookie (un año) y la página se recarga ya traducida. */
export function LanguagePicker() {
  const locale = useLocale();
  const m = useMessages();

  function choose(next: Locale) {
    if (next === locale) return;
    saveLocale(next);
    // Recarga completa: las páginas ya generadas en el otro idioma las sirve el servidor.
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{m.settings.language}</p>
      <div role="radiogroup" aria-label={m.settings.language} className="inline-flex self-start rounded-full bg-line/60 p-1">
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={locale === option}
            lang={option}
            onClick={() => choose(option)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              locale === option ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {m.settings.languages[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
