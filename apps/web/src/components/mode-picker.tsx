"use client";

import { useMessages } from "@/lib/i18n/client";

export type Mode = "game" | "practice";

/** "Partida" (cuenta para el ranking) o "Práctica" (sin límites, no cuenta). Como el selector de dificultad. */
export function ModePicker({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const m = useMessages();
  return (
    <div role="radiogroup" aria-label={m.modes.label} className="inline-flex self-start rounded-full bg-line/60 p-1">
      {(["game", "practice"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => onChange(value)}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${mode === value ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"}`}
        >
          {m.modes[value]}
        </button>
      ))}
    </div>
  );
}
