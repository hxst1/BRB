"use client";

import { useSyncExternalStore } from "react";
import { brand } from "@repo/brand";
import { applyTheme, THEME_KEY, type ThemeChoice } from "@/lib/theme";
import { useMessages } from "@/lib/i18n/client";

/** Las etiquetas están en m.settings.themes. */
const OPTIONS: { value: ThemeChoice }[] = [
  { value: "system" },
  { value: "light" },
  { value: "dark" },
];

const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/** Tema de la app: el del sistema o uno fijo. Se guarda en este dispositivo. */
export function ThemePicker() {
  const m = useMessages();
  const choice = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => "system" as ThemeChoice,
  );

  function choose(value: ThemeChoice) {
    try {
      if (value === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, value);
    } catch {
      // Sin almacenamiento: se aplica igual hasta recargar.
    }
    applyTheme(value, brand.themeColor, brand.themeColorDark);
    listeners.forEach((listener) => listener());
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{m.settings.theme}</p>
      <div role="radiogroup" aria-label={m.settings.theme} className="grid grid-flow-col auto-cols-fr rounded-full bg-line/60 p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choice === option.value}
            onClick={() => choose(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              choice === option.value ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {m.settings.themes[option.value]}
          </button>
        ))}
      </div>
    </div>
  );
}
