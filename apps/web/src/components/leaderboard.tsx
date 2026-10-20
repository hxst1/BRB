"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";

type Scope = "global" | "friends";
type Period = "all" | "week";

export function Leaderboard({
  game,
  viewerId,
  refreshKey,
}: {
  game: string;
  viewerId: string | null;
  refreshKey: number;
}) {
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("all");
  const [result, setResult] = useState<{ key: string; rows: LeaderboardEntry[] | null }>({ key: "", rows: null });
  const key = `${scope}:${period}:${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("get_leaderboard", { game, scope, period, max_rows: 20 })
      .then(({ data }) => {
        if (!cancelled) setResult({ key, rows: data ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [game, scope, period, key]);

  const rows = result.key === key ? result.rows : null;

  return (
    <section aria-labelledby="ranking-title" className="flex w-full max-w-[30rem] flex-col gap-4 lg:max-w-none">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ranking-title" className="display text-3xl font-bold">
          Ranking
        </h2>
        <Toggle
          label="Periodo"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "all", label: "Siempre" },
            { value: "week", label: "Semana" },
          ]}
        />
      </div>

      {viewerId && (
        <Toggle
          label="Jugadores"
          value={scope}
          onChange={setScope}
          options={[
            { value: "global", label: "Todo el mundo" },
            { value: "friends", label: "Amigos" },
          ]}
        />
      )}

      <ol className="flex flex-col">
        {rows === null &&
          Array.from({ length: 5 }, (_, i) => <li key={i} className="h-12 animate-pulse border-b border-line" />)}

        {rows?.length === 0 && (
          <li className="py-6 text-sm text-muted">
            {scope === "friends"
              ? "Ni tú ni tus amigos tenéis partidas aquí todavía. Juega una y estrénalo."
              : "Nadie ha puntuado todavía. La primera posición está libre."}
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
                {isViewer && <span className="ml-2 text-xs font-normal text-muted">tú</span>}
              </span>
              <span className="tabular font-semibold">{row.score.toLocaleString("es", { useGrouping: "always" })}</span>
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
