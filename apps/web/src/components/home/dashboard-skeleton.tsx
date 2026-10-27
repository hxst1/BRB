"use client";

import { DailyCardsSkeleton } from "@/components/daily/daily-cards-skeleton";
import { LevelBarSkeleton } from "@/components/level-bar";
import { Bone, SessionHint, TextLine } from "@/components/skeleton";
import { StreakHeroSkeleton } from "@/components/streak/streak-hero-skeleton";
import { useMessages } from "@/lib/i18n/client";
import { GameCardsSkeleton } from "./game-cards-skeleton";

/**
 * La portada mientras se sabe si hay sesión: el panel o la presentación,
 * según la pista de lib/session-hint.ts (casi siempre acierta).
 */
export function HomeSkeleton() {
  return (
    <>
      <SessionHint />
      <div className="signed-out:hidden">
        <DashboardSkeleton />
      </div>
      <div className="signed-in:hidden">
        <LandingSkeleton />
      </div>
    </>
  );
}

/**
 * El panel (dashboard.tsx) mientras llegan sus datos: las mismas secciones,
 * márgenes y tamaños, con los títulos que no dependen de los datos.
 */
export function DashboardSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden>
      <section className="flex flex-wrap items-center gap-6">
        <span className="grid size-28 shrink-0 place-items-center rounded-[1.75rem] bg-surface shadow-soft">
          <Bone className="size-20 rounded-full" />
        </span>
        <div className="flex min-w-60 flex-1 flex-col gap-4">
          <TextLine className="display w-56 text-5xl sm:w-72 sm:text-6xl" />
          <LevelBarSkeleton className="max-w-sm" />
        </div>
      </section>

      <QuickGamesSkeleton />

      <div className="mt-10 flex flex-col gap-6">
        <StreakHeroSkeleton compact />
        <DailyCardsSkeleton />
      </div>

      <div className="mt-12">
        <div className="flex items-center gap-2.5">
          <p className="text-xl font-semibold">{m.now.title}</p>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft">
              <Bone className="size-10 shrink-0 rounded-full" />
              <span className="flex min-w-0 flex-1 flex-col">
                <TextLine className="w-3/4 text-sm leading-snug" />
                <TextLine className="w-1/3 text-xs" />
              </span>
              <Bone className="h-8 w-16 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** La fila de juegos (quick-games.tsx): el título y los iconos en gris. */
export function QuickGamesSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xl font-semibold">{m.quickGames.title}</p>
        <p className="text-sm font-medium text-muted">{m.quickGames.all}</p>
      </div>
      <ul className="-mx-4 flex gap-3 overflow-hidden px-4 pt-1 pb-2 sm:mx-0 sm:px-0">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} className="flex w-18 shrink-0 flex-col items-center gap-1.5">
            <Bone className="size-14 rounded-2xl" />
            <TextLine className="w-12 text-xs leading-tight" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** La presentación sin sesión (landing.tsx): sus textos (no cambian) y las tarjetas de los juegos. */
function LandingSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden>
      <p className="display max-w-xl text-6xl font-bold text-balance sm:text-8xl">{m.landing.tagline}</p>
      <p className="mt-5 max-w-md text-lg text-muted">{m.landing.intro}</p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Bone className="h-12 w-48 rounded-full" />
        <Bone className="h-12 w-44 rounded-full" />
      </div>
      <div className="mt-16">
        <GameCardsSkeleton />
      </div>
    </div>
  );
}
