"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

type Scope = "global" | "friends";
type Period = "all" | "week";

export function Leaderboard({
  game,
  daily = false,
  formatScore,
  viewerId,
  refreshKey,
}: {
  game: string;
  /** Ranking del reto diario de hoy (solo 2048). */
  daily?: boolean;
  /** Cómo mostrar la puntuación (p. ej. un tiempo); por defecto, el número. */
  formatScore?: (score: number) => string;
  viewerId: string | null;
  refreshKey: number;
}) {
  const m = useMessages();
  const format = formatScore ?? m.format.number;
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("all");
  const [result, setResult] = useState<{ key: string; rows: LeaderboardEntry[] | null }>({ key: "", rows: null });
  const key = `${daily}:${scope}:${period}:${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (daily
      ? supabase.rpc("get_daily_leaderboard", { scope, max_rows: 20 })
      : supabase.rpc("get_leaderboard", { game, scope, period, max_rows: 20 })
    ).then(({ data }) => {
      if (!cancelled) setResult({ key, rows: data ?? [] });
    });
    return () => {
      cancelled = true;
    };
  }, [daily, game, scope, period, key]);

  const rows = result.key === key ? result.rows : null;

  return (
    <section aria-labelledby="ranking-title" className="flex w-full max-w-[30rem] flex-col gap-4 lg:max-w-none">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ranking-title" className="display text-3xl font-bold">
          {daily ? m.ranking.today : m.ranking.title}
        </h2>
        {!daily && (
          <Toggle
            label={m.ranking.period}
            value={period}
            onChange={setPeriod}
            options={[
              { value: "all", label: m.ranking.allTime },
              { value: "week", label: m.ranking.week },
            ]}
          />
        )}
      </div>

      {viewerId && (
        <Toggle
          label={m.ranking.players}
          value={scope}
          onChange={setScope}
          options={[
            { value: "global", label: m.ranking.everyone },
            { value: "friends", label: m.ranking.friends },
          ]}
        />
      )}

      <ol className="flex flex-col">
        {rows === null &&
          Array.from({ length: 5 }, (_, i) => <li key={i} className="h-12 animate-pulse border-b border-line" />)}

        {rows?.length === 0 && (
          <li className="py-6 text-sm text-muted">
            {scope === "friends" ? m.ranking.emptyFriends : daily ? m.ranking.emptyDaily : m.ranking.empty}
          </li>
        )}

        {rows?.map((row) => {
          const isViewer = row.user_id === viewerId;
          return (
            <li
              key={row.user_id}
              className={`flex items-center gap-3 border-b border-line py-2.5 ${isViewer ? "font-semibold" : ""}`}
            >
              <span className="tabular w-6 text-right text-sm text-muted">{row.rank}</span>
              <Avatar seed={row.avatar_seed} parts={row.avatar_parts} size={30} />
              <span className="min-w-0 flex-1 truncate">
                {row.username}
                {isViewer && <span className="ml-2 text-xs font-normal text-muted">{m.common.you}</span>}
              </span>
              <span className="tabular font-semibold">{format(row.score)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Toggle<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex self-start rounded-full bg-line/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            value === option.value ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
