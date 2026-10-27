import { Bone, TextLine } from "@/components/skeleton";

/** La racha (streak-hero) mientras carga: la misma tarjeta, la llama, los días y la semana. */
export function StreakHeroSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* La llama: 120 × 140. */}
        <Bone className={`aspect-[6/7] shrink-0 rounded-[45%_45%_40%_40%] ${compact ? "w-20 sm:w-24" : "w-24 sm:w-32"}`} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-col">
            <TextLine className={`display leading-none ${compact ? "w-14 text-6xl" : "w-20 text-7xl sm:text-8xl"}`} />
            <TextLine className="w-32 text-lg leading-tight" />
          </div>
          {/* El aviso de hoy suele ocupar dos líneas en el móvil. */}
          <span className="flex flex-col text-sm">
            <TextLine className="w-44 max-w-full" />
            <TextLine className="w-28 sm:hidden" />
          </span>
          <TextLine className="w-24 max-w-full text-xs" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="flex flex-col items-center gap-1">
              <TextLine className="w-2 text-[11px]" />
              <span className="size-8 rounded-full bg-line/50" />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex gap-1">
            <Bone className="size-5 rounded-md" />
            <Bone className="size-5 rounded-md" />
          </span>
          <TextLine className="w-28" />
        </div>
      </div>
      {!compact && (
        <span className="flex flex-col text-xs">
          <TextLine className="w-full max-w-xl" />
          <TextLine className="w-1/2 sm:hidden" />
        </span>
      )}
    </div>
  );
}
