"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupporterPart, PART_OPTIONS, resolveMonster, sanitizeParts, type MonsterParts } from "@repo/avatars";
import { randomSeed } from "@repo/games";
import type { Json } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";

type Slot = "body" | "palette" | "eyes" | "mouth" | "top";

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: "body", label: "Cuerpo" },
  { slot: "palette", label: "Color" },
  { slot: "eyes", label: "Ojos" },
  { slot: "mouth", label: "Boca" },
  { slot: "top", label: "Cabeza" },
];

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function AvatarEditor({
  userId,
  initialSeed,
  initialParts,
  isSupporter,
}: {
  userId: string;
  initialSeed: number;
  initialParts: Json;
  isSupporter: boolean;
}) {
  const router = useRouter();
  const [seed, setSeed] = useState(initialSeed);
  const [overrides, setOverrides] = useState<Partial<MonsterParts>>(() => sanitizeParts(initialParts));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [cheer, setCheer] = useState(0);
  const [activeSlot, setActiveSlot] = useState<Slot>("body");
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
        message: error.hint === "supporter_only" ? "Esa parte es exclusiva de supporters." : "No se ha podido guardar. Inténtalo otra vez.",
      });
      return;
    }
    setStatus({ kind: "saved" });
    // La cabecera y el ranking leen el avatar en el servidor.
    router.refresh();
  }

  return (
    <section aria-labelledby="avatar-title" className="flex flex-col gap-6">
      <h2 id="avatar-title" className="sr-only">
        Tu monstruo
      </h2>

      <div className="flex items-center gap-6">
        <div className="grid size-40 shrink-0 place-items-center rounded-[2rem] bg-surface shadow-soft">
          {/* Cambiar la key reinicia el estado de ánimo "contento" tras cada cambio. */}
          <CheeringAvatar key={cheer} seed={seed} parts={overrides} animate={cheer > 0} />
        </div>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => void save(randomSeed(), {})}
            className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
          >
            Tirar el dado
          </button>
          <p aria-live="polite" className="min-h-5 text-sm text-muted">
            {status.kind === "saving" && "Guardando…"}
            {status.kind === "saved" && "Guardado"}
            {status.kind === "error" && <span className="text-danger">{status.message}</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Partes del monstruo" className="flex gap-1 overflow-x-auto rounded-full bg-line/60 p-1">
          {SLOTS.map(({ slot, label }) => (
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
              {label}
            </button>
          ))}
        </div>

        <div id="slot-panel" role="tabpanel" aria-labelledby={`tab-${activeSlot}`} className="flex flex-wrap gap-2">
          {(PART_OPTIONS[activeSlot] as string[]).map((id) => {
            const locked = (activeSlot === "palette" || activeSlot === "top") && isSupporterPart(activeSlot, id) && !isSupporter;
            const selected = monster[activeSlot] === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                disabled={locked}
                title={locked ? "Exclusivo para supporters" : undefined}
                onClick={() => void save(seed, { ...overrides, [activeSlot]: id })}
                className={`relative grid size-16 place-items-center rounded-2xl bg-surface transition-shadow ${
                  selected ? "ring-2 ring-ink" : "shadow-soft hover:shadow-lift"
                } disabled:opacity-40 disabled:hover:shadow-soft`}
              >
                <Avatar seed={seed} parts={{ ...monster, [activeSlot]: id }} size={48} />
                {locked && <span className="sr-only">Exclusivo para supporters</span>}
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
        Coloretes
      </label>

      {!isSupporter && (
        <p className="text-sm text-muted">
          Las partes en gris son para quien apoya el proyecto. Muy pronto podrás conseguirlas.
        </p>
      )}
    </section>
  );
}

/** Se pone contento un momento tras cada cambio y vuelve a su cara normal. */
function CheeringAvatar({ seed, parts, animate }: { seed: number; parts: Partial<MonsterParts>; animate: boolean }) {
  const [happy, setHappy] = useState(animate);

  useEffect(() => {
    if (!happy) return;
    const timer = setTimeout(() => setHappy(false), 900);
    return () => clearTimeout(timer);
  }, [happy]);

  return (
    <span className={happy ? "monster-cheer" : undefined}>
      <Avatar seed={seed} parts={parts} size={128} mood={happy ? "happy" : "neutral"} label="Tu monstruo" />
    </span>
  );
}
