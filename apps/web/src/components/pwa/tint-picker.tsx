"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { applyTint, TINT_KEY, TINTS } from "@/lib/theme";

const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(TINT_KEY);
  } catch {
    return null;
  }
}

function save(tint: string | null) {
  try {
    if (tint) localStorage.setItem(TINT_KEY, tint);
    else localStorage.removeItem(TINT_KEY);
  } catch {
    // Sin almacenamiento: se aplica igual hasta recargar.
  }
  applyTint(tint);
  listeners.forEach((listener) => listener());
}

/** Color de toda la app: exclusivo de quien apoya el proyecto. */
export function TintPicker({ isSupporter }: { isSupporter: boolean }) {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => null,
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        Color de la app <span style={{ color: "var(--t256)" }}>✦</span>
      </p>
      <div role="radiogroup" aria-label="Color de la app" className="flex flex-wrap gap-2">
        <Swatch label="Clásico" color="var(--line)" selected={!current} disabled={!isSupporter} onClick={() => save(null)} />
        {TINTS.map((tint) => (
          <Swatch
            key={tint.value}
            label={tint.label}
            color={tint.color}
            selected={current === tint.value}
            disabled={!isSupporter}
            onClick={() => save(tint.value)}
          />
        ))}
      </div>
      {!isSupporter && (
        <p className="text-sm text-muted">
          Exclusivo para quien apoya el proyecto.{" "}
          <Link href="/apoyar" className="font-medium text-ink underline underline-offset-4">
            Cómo conseguirlo
          </Link>
        </p>
      )}
    </div>
  );
}

function Swatch({ label, color, selected, disabled, onClick }: { label: string; color: string; selected: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
        selected ? "border-ink font-medium" : "border-line hover:border-muted"
      }`}
    >
      <span aria-hidden className="size-4 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

/** Si alguien deja de apoyar, se le quita el tinte que tuviera puesto. */
export function TintGuard({ isSupporter }: { isSupporter: boolean }) {
  useEffect(() => {
    if (!isSupporter && read()) save(null);
  }, [isSupporter]);
  return null;
}
