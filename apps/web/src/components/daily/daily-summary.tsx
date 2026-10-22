import Link from "next/link";
import type { DailySummary } from "@repo/db";
import { dailyGameName, DAILY_GAMES, formatDailyScore } from "@/lib/daily";
import type { Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";

/** "martes, 20 de octubre" a partir de la fecha del reto (AAAA-MM-DD). */
export function formatDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** Racha de días seguidos jugando, o un empujón para empezarla. */
export async function StreakText({ summary }: { summary: DailySummary }) {
  const m = await getMessages();
  const days = summary.streak_days;
  if (days === 0) return <span className="text-muted">{m.daily.startStreak}</span>;
  const label = m.daily.streak(days);
  return (
    <span>
      <span aria-hidden>🔥 </span>
      <strong>{label}</strong>
      {!summary.played_today && <span className="text-muted">{m.daily.keepStreak}</span>}
    </span>
  );
}

/** Estado del reto de hoy: por jugar, o cómo quedaste. */
export async function DailyResult({ summary }: { summary: DailySummary }) {
  const m = await getMessages();
  if (summary.status === "finished") {
    const timed = DAILY_GAMES[summary.game]?.time;
    return (
      <span>
        {timed ? m.daily.todayTook : m.daily.todayScored}
        <strong className="tabular">{formatDailyScore(summary.game, summary.score, m)}</strong>:{" "}
        <strong>{m.daily.rank(summary.rank ?? 0, summary.players ?? 0)}</strong>
        .
      </span>
    );
  }
  if (summary.status === "available") {
    return <span>{m.daily.todayIs(dailyGameName(summary.game, m))}</span>;
  }
  return <span className="text-muted">{m.daily.used}</span>;
}

/** Tarjeta del panel de inicio. */
export async function DailyCard({ summary }: { summary: DailySummary }) {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const available = summary.status === "available";
  return (
    <section aria-labelledby="daily-title" className="flex max-w-xl flex-col gap-3 rounded-3xl bg-surface p-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="daily-title" className="text-xl font-semibold">
          {m.daily.title}
        </h2>
        <span className="text-sm text-muted first-letter:uppercase">{formatDay(summary.day, locale)}</span>
      </div>
      <p>
        <DailyResult summary={summary} />
      </p>
      <p className="text-sm">
        <StreakText summary={summary} />
      </p>
      <NextGame summary={summary} />
      <Link
        href="/reto-diario"
        className={`self-start rounded-full px-4 py-2 text-sm font-medium ${
          available ? "bg-ink text-bg" : "border border-line hover:border-muted"
        }`}
      >
        {available ? m.daily.play : m.daily.seeRanking}
      </Link>
    </section>
  );
}

/** Qué toca mañana, para volver. */
export async function NextGame({ summary }: { summary: Pick<DailySummary, "next_game"> }) {
  if (!summary.next_game) return null;
  const m: Messages = await getMessages();
  return <p className="text-sm text-muted">{m.daily.tomorrow(dailyGameName(summary.next_game, m))}</p>;
}
