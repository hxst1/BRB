import type { StreakStatus } from "@repo/db";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { recentDays, streakTier } from "@/lib/streak";
import { Flame } from "./flame";

/** Protectores de racha: como mucho 2. */
const MAX_FREEZES = 2;

/**
 * La racha en grande: la llama, los días, qué falta para el siguiente tramo,
 * los protectores y la última semana. `compact`, para la portada.
 */
export async function StreakHero({ streak, compact = false }: { streak: StreakStatus; compact?: boolean }) {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const t = m.streak;
  const days = streak.streak_days;
  const { tier, next } = streakTier(days);
  const mood = days === 0 ? "asleep" : streak.played_today ? "happy" : "worried";
  const week = recentDays(streak.recent).slice(-7);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });

  return (
    <section aria-labelledby="streak-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-4 sm:gap-6">
        <Flame days={days} mood={mood} label={t.tiers[tier]} className={compact ? "h-auto w-20 sm:w-24" : "h-auto w-24 sm:w-32"} />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="streak-title" className="flex flex-col">
            <span className={`display tabular leading-none font-bold ${compact ? "text-6xl" : "text-7xl sm:text-8xl"}`}>{days}</span>
            <span className="text-lg leading-tight font-semibold">{t.days(days)}</span>
          </h2>
          <p className={`text-sm font-medium ${streak.played_today ? "text-ink" : days > 0 ? "text-danger" : "text-muted"}`}>
            {streak.played_today ? t.safeToday : days > 0 ? t.playToday : t.start}
          </p>
          <p className="text-xs text-muted">
            {t.tiers[tier]}
            {next && days > 0 && <> · {t.nextTier(next.in, t.tiers[next.tier])}</>}
            {streak.streak_best > days && <> · {t.best(streak.streak_best)}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* La última semana: llama si jugó, escudo si le salvó un protector. */}
        <ol aria-label={t.week} className="flex gap-1.5">
          {week.map((day, i) => {
            const today = i === week.length - 1;
            return (
              <li key={day.day} className="flex flex-col items-center gap-1">
                <span className={`text-[11px] uppercase ${today ? "font-bold text-ink" : "text-muted"}`}>
                  {weekday.format(new Date(`${day.day}T00:00:00Z`))}
                </span>
                <span
                  title={day.kind === "played" ? t.played : day.kind === "frozen" ? t.frozen : t.missed}
                  className={`grid size-8 place-items-center rounded-full ${day.kind ? "" : today ? "border-2 border-dashed border-line" : "bg-line/50"}`}
                  style={day.kind === "played" ? { background: "color-mix(in srgb, #ff922b 22%, transparent)" } : day.kind === "frozen" ? { background: "color-mix(in srgb, #4dabf7 22%, transparent)" } : undefined}
                >
                  {day.kind === "played" && <MiniFlame />}
                  {day.kind === "frozen" && <Shield className="size-4" />}
                  <span className="sr-only">{day.kind === "played" ? t.played : day.kind === "frozen" ? t.frozen : t.missed}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <p className="flex items-center gap-2 text-sm" title={t.freezesHint}>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <Shield key={i} className={`size-5 ${i < streak.freezes ? "" : "opacity-25 grayscale"}`} />
            ))}
          </span>
          {/* Si un protector está tapando un día perdido, eso es lo importante: hay que jugar hoy. */}
          <span>
            {streak.covering > 0 ? (
              <>
                <strong>{t.covering(streak.covering)}</strong>
                {streak.freezes > 0 && <span className="text-muted"> · {t.freezesLeft(streak.freezes)}</span>}
              </>
            ) : (
              <strong>{t.freezes(streak.freezes)}</strong>
            )}
          </span>
        </p>
      </div>
      {!compact && <p className="text-xs text-muted">{t.freezesHint}</p>}
    </section>
  );
}

function MiniFlame() {
  return (
    <svg viewBox="0 0 24 28" className="size-4" aria-hidden>
      <path d="M12 27C5 27 2 22 3.6 17 4.6 14 7 12 7.4 8 11 10 12.6 13 12.4 15.6 14 14 14.4 12 14 9.6 18.6 13 21 18 20 22 19 25.4 16 27 12 27Z" fill="#ff922b" stroke="#15171c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Protector de racha: un escudo de hielo. */
export function Shield({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 26" className={className} aria-hidden>
      <path d="M12 2 21 5.5v6.5c0 6-4 10-9 12-5-2-9-6-9-12V5.5z" fill="#74c0fc" stroke="#15171c" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7v12M7.5 9.5l9 7M16.5 9.5l-9 7" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
