"use client";

import { levelFromXp } from "@repo/games/level";
import { useMessages } from "@/lib/i18n/client";

export function LevelBar({ xp, className = "", compact = false }: { xp: number; className?: string; compact?: boolean }) {
  const { level, xpIntoLevel, xpForNext, progress } = levelFromXp(xp);
  const m = useMessages();
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="shrink-0 text-xs text-muted">{m.level.level(level)}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-ink" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-semibold">{m.level.level(level)}</span>
        <span className="tabular text-muted">
          {m.level.toNext(xpIntoLevel, xpForNext, level + 1)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={m.level.progress(level + 1)}
        aria-valuemin={0}
        aria-valuemax={xpForNext}
        aria-valuenow={xpIntoLevel}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
