"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isSupporterPart, PART_OPTIONS, partAchievement, resolveMonster, sanitizeParts, type MonsterParts } from "@repo/avatars";
import { randomSeed } from "@repo/games";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { achievementById } from "@/lib/achievements";
import { useLocale, useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

type Slot = "body" | "palette" | "eyes" | "mouth" | "top";

const SLOTS: Slot[] = ["body", "palette", "eyes", "mouth", "top"];

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function AvatarEditor({
  userId,
  initialSeed,
  initialParts,
  isSupporter,
  unlocked,
}: {
  userId: string;
  initialSeed: number;
  initialParts: Json;
  isSupporter: boolean;
  /** Logros conseguidos: desbloquean su ropa. */
  unlocked: readonly string[];
}) {
  const router = useRouter();
  const m = useMessages();
  const t = m.avatar;
  const locale = useLocale();
  const [seed, setSeed] = useState(initialSeed);
  const [overrides, setOverrides] = useState<Partial<MonsterParts>>(() => sanitizeParts(initialParts));
  // Si el monster guardado cambia (al guardar aquí, o fuera, p. ej. al estrenar un
  // logro), se toma el nuevo sin reiniciar el editor: así no se pierde la pestaña abierta.
  const savedKey = `${initialSeed}:${JSON.stringify(initialParts)}`;
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (savedKey !== syncedKey) {
    setSyncedKey(savedKey);
    setSeed(initialSeed);
    setOverrides(sanitizeParts(initialParts));
  }
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [cheer, setCheer] = useState(0);
  const [activeSlot, setActiveSlot] = useState<Slot>("body");
  /** Parte bloqueada que se ha pulsado: se explica cómo conseguirla. */
  const [lockedPart, setLockedPart] = useState<{ slot: "palette" | "top"; id: string; achievement: string | null } | null>(null);
  const monster = resolveMonster(seed, overrides);

  async function save(nextSeed: number, nextOverrides: Partial<MonsterParts>) {
    const previous = { seed, overrides };
    setSeed(nextSeed);
    setOverrides(nextOverrides);
    setCheer((n) => n + 1);
    setStatus({ kind: "saving" });

    const { error } = await createClient()
      .from("profiles")
      .update({ avatar_seed: nextSeed, avatar_parts: nextOverrides })
      .eq("id", userId);

    if (error) {
      setSeed(previous.seed);
      setOverrides(previous.overrides);
      setStatus({
        kind: "error",
        message:
          error.hint === "supporter_only"
            ? t.supporterOnly
            : error.hint === "achievement_only"
              ? t.achievementOnly
              : t.saveError,
      });
      return;
    }
    setStatus({ kind: "saved" });
    // La cabecera y el ranking leen el avatar en el servidor.
    router.refresh();
  }

  return (
    <section aria-labelledby="avatar-title" className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
      <h2 id="avatar-title" className="sr-only">
        {m.home.yourMonster}
      </h2>

      <div className="flex items-center gap-6 lg:flex-col lg:items-start">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <CheeringAvatar changes={cheer} seed={seed} parts={overrides} />
          <p className="text-xs text-muted">{t.tapToGreet}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => void save(randomSeed(), {})}
            className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
          >
            {t.roll}
          </button>
          <p aria-live="polite" className="min-h-5 text-sm text-muted">
            {status.kind === "saving" && m.common.saving}
            {status.kind === "saved" && m.common.saved}
            {status.kind === "error" && <span className="text-danger">{status.message}</span>}
          </p>
          {status.kind === "saved" && <InstalledIconNote />}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label={t.parts} className="flex gap-1 overflow-x-auto rounded-full bg-line/60 p-1">
            {SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                role="tab"
                id={`tab-${slot}`}
                aria-selected={activeSlot === slot}
                aria-controls="slot-panel"
                onClick={() => setActiveSlot(slot)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  activeSlot === slot ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
                }`}
              >
                {t.slots[slot]}
              </button>
            ))}
          </div>

          <div id="slot-panel" role="tabpanel" aria-labelledby={`tab-${activeSlot}`} className="flex flex-wrap gap-2">
            {(PART_OPTIONS[activeSlot] as string[]).map((id) => {
              const lockable = activeSlot === "palette" || activeSlot === "top";
              const needed = lockable ? partAchievement(activeSlot, id) : null;
              const supporterOnly = lockable && isSupporterPart(activeSlot, id) && !isSupporter;
              const achievementLocked = needed !== null && !unlocked.includes(needed);
              const locked = supporterOnly || achievementLocked;
              const lockReason = supporterOnly
                ? t.supportersOnly
                : achievementLocked
                  ? t.unlockWith(achievementById(needed, locale)?.name ?? needed)
                  : undefined;
              const selected = monster[activeSlot] === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  aria-haspopup={locked ? "dialog" : undefined}
                  title={lockReason}
                  onClick={() =>
                    locked
                      ? setLockedPart({ slot: activeSlot as "palette" | "top", id, achievement: achievementLocked ? needed : null })
                      : void save(seed, { ...overrides, [activeSlot]: id })
                  }
                  className={`relative grid size-16 place-items-center rounded-2xl bg-surface transition-shadow ${
                    selected ? "ring-2 ring-ink" : "shadow-soft hover:shadow-lift"
                  }`}
                >
                  <span className={locked ? "opacity-40" : undefined}>
                    <Avatar seed={seed} parts={{ ...monster, [activeSlot]: id }} size={48} />
                  </span>
                  {locked && <span className="sr-only">{lockReason}</span>}
                  {locked && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[10px]"
                      style={{ background: supporterOnly ? "var(--t256)" : "var(--ink)", color: supporterOnly ? "#15171c" : "var(--bg)" }}
                    >
                      {supporterOnly ? "✦" : "🔒"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={monster.cheeks}
            onChange={(event) => void save(seed, { ...overrides, cheeks: event.target.checked })}
            className="size-4 accent-ink"
          />
          {t.cheeks}
        </label>

        {lockedPart && (
          <LockedPartDialog
            part={lockedPart}
            seed={seed}
            monster={monster}
            onClose={() => setLockedPart(null)}
          />
        )}

        <p className="text-sm text-muted">
          {t.lockedHint}{" "}
          <Link href="/perfil?seccion=logros" className="font-medium text-ink underline underline-offset-4">
            {t.achievementsLink}
          </Link>
          .
          {!isSupporter && (
            <>
              {" "}
              {t.supporterHint}{" "}
              <Link href="/apoyar" className="font-medium text-ink underline underline-offset-4">
                {t.howToGet}
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}

/**
 * El monster del editor. Con cada cambio da un pequeño rebote sin cambiar de
 * cara (así se ve al momento la parte nueva); al tocarlo, salta contento.
 */
function CheeringAvatar({ seed, parts, changes }: { seed: number; parts: Partial<MonsterParts>; changes: number }) {
  const m = useMessages();
  const [happy, setHappy] = useState(0);

  useEffect(() => {
    if (!happy) return;
    const timer = setTimeout(() => setHappy(0), 900);
    return () => clearTimeout(timer);
  }, [happy]);

  return (
    <button
      type="button"
      onClick={() => setHappy((n) => n + 1)}
      aria-label={m.avatar.greet}
      className="grid size-40 place-items-center rounded-[2rem] bg-surface shadow-soft transition-shadow hover:shadow-lift lg:size-48"
    >
      {/* La key reinicia la animación: el rebote con cada cambio y el salto con cada toque. */}
      <span key={`${changes}:${happy}`} className={happy ? "monster-cheer" : changes ? "monster-pop" : undefined}>
        <Avatar seed={seed} parts={parts} size={128} mood={happy ? "happy" : "neutral"} label={m.home.yourMonster} />
      </span>
    </button>
  );
}

/**
 * En la app instalada, el icono de la pantalla de inicio no cambia al momento:
 * Android lo actualiza solo al cabo de un tiempo; en iPhone hay que volver a
 * añadir la app. Solo se avisa dentro de la app instalada.
 */
function InstalledIconNote() {
  const [platform, setPlatform] = useState<"ios" | "other" | null>(null);
  const m = useMessages();

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
    if (!standalone) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    // Tras guardar, una sola vez: no hay bucle de renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(ios ? "ios" : "other");
  }, []);

  if (!platform) return null;
  return (
    <p className="max-w-56 text-xs text-muted">
      {platform === "ios"
        ? m.avatar.iconIos
        : m.avatar.iconOther}
    </p>
  );
}

/** Por qué no se puede poner esa parte y cómo conseguirla: un logro o apoyar el proyecto. */
function LockedPartDialog({
  part,
  seed,
  monster,
  onClose,
}: {
  part: { slot: "palette" | "top"; id: string; achievement: string | null };
  seed: number;
  monster: MonsterParts;
  onClose: () => void;
}) {
  const m = useMessages();
  const t = m.avatar;
  const locale = useLocale();
  const achievement = part.achievement ? achievementById(part.achievement, locale) : null;
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex w-full max-w-sm flex-col items-center gap-4 rounded-[1.75rem] bg-surface p-6 text-center shadow-lift"
      >
        <span className="grid size-28 place-items-center rounded-[1.75rem]" style={{ background: "var(--cell)" }}>
          <Avatar seed={seed} parts={{ ...monster, [part.slot]: part.id }} size={96} mood="happy" />
        </span>
        {achievement ? (
          <>
            <h2 id="locked-title" className="display text-2xl font-bold">
              {t.lockedAchievement}
            </h2>
            <p className="text-muted">
              {t.getAchievement}{" "}
              <strong className="text-ink">
                {achievement.icon} {achievement.name}
              </strong>
              : {achievement.description.charAt(0).toLowerCase() + achievement.description.slice(1)}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/perfil?seccion=logros" onClick={onClose} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">
                {m.achievements.see}
              </Link>
              <button ref={close} type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-muted">
                {m.common.close}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="locked-title" className="display text-2xl font-bold">
              {t.lockedSupporter}
            </h2>
            <p className="text-muted">
              {t.lockedSupporterBody}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/apoyar" onClick={onClose} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">
                {t.howToSupport}
              </Link>
              <button ref={close} type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-muted">
                {m.common.close}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
