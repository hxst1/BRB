import Link from "next/link";
import type { DailySummary } from "@repo/db";
import { formatNumber } from "@/lib/format";

/** "martes, 20 de octubre" a partir de la fecha del reto (AAAA-MM-DD). */
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** Racha de días seguidos jugando, o un empujón para empezarla. */
export function StreakText({ summary }: { summary: DailySummary }) {
  const days = summary.streak_days;
  if (days === 0) return <span className="text-muted">Juega hoy para empezar una racha.</span>;
  const label = days === 1 ? "1 día seguido" : `${days} días seguidos`;
  return (
    <span>
      <span aria-hidden>🔥 </span>
      <strong>{label}</strong>
      {!summary.played_today && <span className="text-muted">. Juega hoy para no perder la racha.</span>}
    </span>
  );
}

/** Estado del reto de hoy: por jugar, o cómo quedaste. */
export function DailyResult({ summary }: { summary: DailySummary }) {
  if (summary.status === "finished") {
    return (
      <span>
        Hoy has hecho <strong className="tabular">{formatNumber(summary.score)}</strong> puntos:{" "}
        <strong>
          {summary.rank}º de {summary.players}
        </strong>
        .
      </span>
    );
  }
  if (summary.status === "available") {
    return <span>La misma partida de 2048 para todos. Un solo intento.</span>;
  }
  return <span className="text-muted">Ya has usado el intento de hoy. Mañana hay otro.</span>;
}

/** Tarjeta del panel de inicio. */
export function DailyCard({ summary }: { summary: DailySummary }) {
  const available = summary.status === "available";
  return (
    <section aria-labelledby="daily-title" className="flex max-w-xl flex-col gap-3 rounded-3xl bg-surface p-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="daily-title" className="text-xl font-semibold">
          Reto diario
        </h2>
        <span className="text-sm text-muted first-letter:uppercase">{formatDay(summary.day)}</span>
      </div>
      <p>
        <DailyResult summary={summary} />
      </p>
      <p className="text-sm">
        <StreakText summary={summary} />
      </p>
      <Link
        href="/reto-diario"
        className={`self-start rounded-full px-4 py-2 text-sm font-medium ${
          available ? "bg-ink text-bg" : "border border-line hover:border-muted"
        }`}
      >
        {available ? "Jugar el reto" : "Ver el ranking de hoy"}
      </Link>
    </section>
  );
}
