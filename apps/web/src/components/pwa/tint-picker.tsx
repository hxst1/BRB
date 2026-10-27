"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { InlinePicto } from "@/components/picto";
import { achievementById, achievementVisible } from "@/lib/achievements";
import { applyTint, TINT_KEY, TINTS } from "@/lib/theme";
import { useLocale, useMessages } from "@/lib/i18n/client";

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

/** Lo pone y avisa a los selectores abiertos (también lo usa el aviso de logro). */
export const setTint = save;

/**
 * Color de toda la app. Los de logro, para quien tenga el logro (`unlocked`);
 * el resto (✦), para quien apoya el proyecto.
 */
export function TintPicker({ isSupporter, unlocked }: { isSupporter: boolean; unlocked: readonly string[] }) {
  const m = useMessages();
  const locale = useLocale();
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => null,
  );
  const locked = (tint: (typeof TINTS)[number]) => (tint.achievement ? !unlocked.includes(tint.achievement) : !isSupporter);
  // Los de un logro que ya no se puede conseguir solo salen a quien lo tiene.
  const tints = TINTS.filter((tint) => {
    const achievement = tint.achievement ? achievementById(tint.achievement, locale) : undefined;
    return !achievement || achievementVisible(achievement, !locked(tint));
  });
  const anyAchievementLocked = tints.some((tint) => tint.achievement && locked(tint));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{m.settings.tint}</p>
      <div role="radiogroup" aria-label={m.settings.tint} className="flex flex-wrap gap-2">
        <Swatch label={m.settings.classic} color="var(--line)" selected={!current} onClick={() => save(null)} />
        {tints.map((tint) => (
          <Swatch
            key={tint.value}
            label={m.settings.tints[tint.value]}
            color={tint.color}
            selected={current === tint.value}
            supporter={!tint.achievement}
            locked={locked(tint)}
            hint={tint.achievement ? m.settings.tintFromAchievement(achievementById(tint.achievement, locale)?.name ?? "") : undefined}
            onClick={() => save(tint.value)}
          />
        ))}
      </div>
      {anyAchievementLocked && (
        <p className="text-sm text-muted">
          {m.settings.tintAchievementsLocked}{" "}
          <Link href="/perfil?seccion=logros" className="font-medium text-ink underline underline-offset-4">
            {m.settings.seeAchievements}
          </Link>
        </p>
      )}
      {!isSupporter && (
        <p className="text-sm text-muted">
          {m.settings.tintLocked}{" "}
          <Link href="/apoyar" className="font-medium text-ink underline underline-offset-4">
            {m.settings.howToGetIt}
          </Link>
        </p>
      )}
    </div>
  );
}

function Swatch({
  label,
  color,
  selected,
  supporter = false,
  locked = false,
  hint,
  onClick,
}: {
  label: string;
  color: string;
  selected: boolean;
  /** Lleva ✦: es de quien apoya. */
  supporter?: boolean;
  locked?: boolean;
  /** Cómo se consigue (al pasar por encima y para los lectores de pantalla). */
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={locked}
      title={hint}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
        selected ? "border-ink font-medium" : "border-line hover:border-muted"
      }`}
    >
      <span aria-hidden className="size-4 rounded-full" style={{ background: color }} />
      {label}
      {supporter && (
        <span aria-hidden style={{ color: "var(--t256)" }}>
          ✦
        </span>
      )}
      {locked && !supporter && <InlinePicto name="lock" className="-ml-0.5 opacity-80" />}
      {hint && locked && <span className="sr-only">. {hint}</span>}
    </button>
  );
}

/**
 * Si alguien deja de apoyar, se le quita el tinte de quien apoya que tuviera
 * puesto. Los de logro se quedan: un logro no se pierde.
 */
export function TintGuard({ isSupporter }: { isSupporter: boolean }) {
  useEffect(() => {
    const current = read();
    if (!isSupporter && current && !TINTS.find((tint) => tint.value === current)?.achievement) save(null);
  }, [isSupporter]);
  return null;
}
