import { levelFromXp } from "@/lib/level";

export function LevelBar({ xp, className = "" }: { xp: number; className?: string }) {
  const { level, xpIntoLevel, xpForNext, progress } = levelFromXp(xp);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-semibold">Nivel {level}</span>
        <span className="tabular text-muted">
          {xpIntoLevel} / {xpForNext} XP para el {level + 1}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Progreso hacia el nivel ${level + 1}`}
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
