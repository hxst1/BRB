"use client";

import { LeaderboardSkeleton } from "@/components/leaderboard";
import { Bone, SessionHint, TextLine } from "@/components/skeleton";
import { StreakHeroSkeleton } from "@/components/streak/streak-hero-skeleton";
import { useMessages } from "@/lib/i18n/client";
import { DailyCardsSkeleton } from "./daily-cards-skeleton";

/**
 * El reto diario (reto-diario/page.tsx) mientras carga: el título, la racha,
 * los retos y el reto elegido listo para empezar; sin sesión, los retos y
 * el ranking del día.
 */
export function DailyPageSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden inert>
      <SessionHint />
      <div className="mb-6">
        <p className="display text-6xl font-bold sm:text-7xl">{m.daily.title}</p>
        <p className="text-muted">{m.daily.intro}</p>
      </div>

      <div className="signed-out:hidden">
        <div className="flex flex-col gap-6">
          <StreakHeroSkeleton />
          <DailyCardsSkeleton />
        </div>
        <div className="mt-12">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <TextLine className="w-28 text-base" />
              <TextLine className="display w-48 text-4xl" />
            </div>
            {/* El sonido y "cómo se juega". */}
            <span className="flex shrink-0 gap-2">
              <Bone className="size-10 rounded-full" />
              <Bone className="size-10 rounded-full" />
            </span>
          </div>
          <div className="flex max-w-xl flex-col items-start gap-4 rounded-3xl bg-surface p-5 shadow-soft">
            <TextLine className="w-full max-w-sm" />
            <Bone className="h-11 w-40 rounded-full" />
          </div>
        </div>
      </div>

      <div className="signed-in:hidden">
        <DailyCardsSkeleton title={false} />
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col">
            <TextLine className="w-full" />
            <TextLine className="w-2/3" />
          </div>
          <LeaderboardSkeleton daily />
        </div>
      </div>
    </div>
  );
}
