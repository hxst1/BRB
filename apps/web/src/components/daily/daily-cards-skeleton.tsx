"use client";

import { Bone, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

const SLOTS = ["puzzle", "arcade", "wordle", "duel"] as const;

/**
 * Los retos de hoy (daily-cards) mientras cargan: el título, y las cuatro
 * tarjetas con su tipo de reto (eso ya se sabe) y el resto en gris. En fila
 * deslizable en el móvil, como las de verdad.
 */
export function DailyCardsSkeleton({ title = true }: { title?: boolean }) {
  const m = useMessages();
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xl font-semibold">{m.dailies.title}</p>
          <TextLine className="w-24 text-sm" />
        </div>
      )}
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 pt-1 pb-3 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
        {SLOTS.map((slot) => (
          <li key={slot} className="w-[clamp(14rem,68%,16rem)] shrink-0 lg:w-auto">
            <div className="flex h-full flex-col gap-3 rounded-3xl bg-surface p-4 shadow-soft">
              <Bone className="size-14 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-xs font-semibold text-muted">{m.dailies.slots[slot]}</span>
                {slot === "wordle" ? (
                  <span className="display text-2xl leading-tight font-bold">Wordle</span>
                ) : (
                  <TextLine className="display w-28 text-2xl leading-tight" />
                )}
                <span className="flex flex-col text-sm">
                  <TextLine className="w-full" />
                  <TextLine className="w-2/3" />
                </span>
              </div>
              <Bone className="h-9 w-20 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
