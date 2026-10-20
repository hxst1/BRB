"use client";

import { useEffect, useState } from "react";
import type { Json } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { formatNumber } from "@/lib/format";
import { levelFromXp } from "@/lib/level";
import { createClient } from "@/lib/supabase/client";

type Category = "level" | "2048" | "tictactoe" | "rps";
type Scope = "global" | "friends";
type Period = "all" | "week";

type Row = {
  rank: number;
  userId: string;
  username: string;
  avatarSeed: number;
  avatarParts: Json;
  /** Dato principal (nivel, puntos, victorias). */
  value: string;
  /** Detalle secundario (XP, partidas, porcentaje). */
  detail?: string;
};

/** `label` va en la pestaña (hasta dos líneas); `title`, para lectores de pantalla y el tooltip. */
const CATEGORIES: { id: Category; label: string; title: string; hasPeriod: boolean }[] = [
  { id: "level", label: "Nivel", title: "Nivel", hasPeriod: false },
  { id: "2048", label: "2048", title: "2048", hasPeriod: true },
  { id: "tictactoe", label: "3 en raya", title: "3 en raya", hasPeriod: true },
  { id: "rps", label: "Piedra, papel o tijera", title: "Piedra, papel o tijera", hasPeriod: true },
];

function CategoryIcon({ id }: { id: Category }) {
  switch (id) {
    case "level":
      return <span className="text-lg leading-none">⭐</span>;
    case "2048":
      return (
        <span className="grid size-5 grid-cols-2 gap-0.5">
          {[8, 64, 512, 2048].map((value) => (
            <span key={value} className="rounded-[3px]" style={{ background: `var(--t${value})` }} />
          ))}
        </span>
      );
    case "tictactoe":
      return (
        <span className="text-base leading-none font-bold">
          <span style={{ color: "var(--mark-x)" }}>×</span>
          <span style={{ color: "var(--mark-o)" }}>○</span>
        </span>
      );
    case "rps":
      return <span className="text-lg leading-none">✂️</span>;
  }
}

const MAX_ROWS = 50;

async function loadRows(category: Category, scope: Scope, period: Period): Promise<Row[]> {
  const supabase = createClient();

  if (category === "level") {
    const { data } = await supabase.rpc("get_level_leaderboard", { scope, max_rows: MAX_ROWS });
    return (data ?? []).map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      username: r.username,
      avatarSeed: r.avatar_seed,
      avatarParts: r.avatar_parts,
      value: `Nivel ${levelFromXp(r.xp).level}`,
      detail: `${formatNumber(r.xp)} XP`,
    }));
  }

  if (category === "2048") {
    const { data } = await supabase.rpc("get_leaderboard", { game: "2048", scope, period, max_rows: MAX_ROWS });
    return (data ?? []).map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      username: r.username,
      avatarSeed: r.avatar_seed,
      avatarParts: r.avatar_parts,
      value: formatNumber(r.score),
      detail: "puntos",
    }));
  }

  const games = category === "tictactoe" ? ["tictactoe"] : ["rps", "rpsls"];
  const { data } = await supabase.rpc("get_match_leaderboard", { games, scope, period, max_rows: MAX_ROWS });
  return (data ?? []).map((r) => ({
    rank: r.rank,
    userId: r.user_id,
    username: r.username,
    avatarSeed: r.avatar_seed,
    avatarParts: r.avatar_parts,
    value: r.wins === 1 ? "1 victoria" : `${formatNumber(r.wins)} victorias`,
    detail: `${r.played} ${r.played === 1 ? "partida" : "partidas"} · ${Math.round((r.wins / r.played) * 100)} %`,
  }));
}

export function RankingBoard({ viewerId }: { viewerId: string | null }) {
  const [category, setCategory] = useState<Category>("level");
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("all");
  const [result, setResult] = useState<{ key: string; rows: Row[] } | null>(null);

  const hasPeriod = CATEGORIES.find((c) => c.id === category)!.hasPeriod;
  const effectivePeriod = hasPeriod ? period : "all";
  const key = `${category}:${scope}:${effectivePeriod}`;

  useEffect(() => {
    let cancelled = false;
    loadRows(category, scope, effectivePeriod).then((rows) => {
      if (!cancelled) setResult({ key, rows });
    });
    return () => {
      cancelled = true;
    };
  }, [category, scope, effectivePeriod, key]);

  const rows = result?.key === key ? result.rows : null;
  // El usuario puede venir al final aunque no esté en el top.
  const top = rows?.filter((row) => row.rank <= MAX_ROWS) ?? [];
  const extraMe = rows?.find((row) => row.rank > MAX_ROWS && row.userId === viewerId) ?? null;
  const podium = top.filter((row) => row.rank <= 3).slice(0, 3);
  const rest = top.slice(podium.length);

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Categoría" className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={c.title}
              title={c.title}
              onClick={() => setCategory(c.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5 transition-colors ${
                active ? "bg-ink text-bg" : "bg-surface text-muted shadow-soft hover:text-ink"
              }`}
            >
              <span aria-hidden className="grid h-5 place-items-center">
                <CategoryIcon id={c.id} />
              </span>
              <span aria-hidden className="line-clamp-2 w-full text-center text-xs leading-tight font-medium text-balance">
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      {(viewerId || hasPeriod) && (
        <div className="flex items-center justify-between gap-2">
          {viewerId ? (
            <Toggle
              label="Jugadores"
              value={scope}
              onChange={setScope}
              options={[
                { value: "global", label: "Global" },
                { value: "friends", label: "Amigos" },
              ]}
            />
          ) : (
            <span />
          )}
          {hasPeriod && (
            <Toggle
              label="Periodo"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "all", label: "Siempre" },
                { value: "week", label: "Semana" },
              ]}
            />
          )}
        </div>
      )}

      {rows === null ? (
        <div className="h-64 animate-pulse rounded-3xl bg-line/40" />
      ) : top.length === 0 ? (
        <p className="py-10 text-center text-muted">
          {scope === "friends"
            ? "Ni tú ni tus amigos aparecéis aquí todavía. Echad unas partidas."
            : effectivePeriod === "week"
              ? "Nadie ha jugado esta semana. El primer puesto está libre."
              : "Aún no hay nadie en este ranking. Estrénalo."}
        </p>
      ) : (
        <>
          <Podium rows={podium} viewerId={viewerId} />
          {rest.length > 0 && (
            <ol className="flex flex-col">
              {rest.map((row) => (
                <RankRow key={row.userId} row={row} isViewer={row.userId === viewerId} />
              ))}
            </ol>
          )}
          {extraMe && (
            <div>
              <p className="py-1 text-center text-muted" aria-hidden>
                ⋯
              </p>
              <ol>
                <RankRow row={extraMe} isViewer />
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Los tres primeros, con sus monstruos (el primero en el centro y más alto). */
function Podium({ rows, viewerId }: { rows: Row[]; viewerId: string | null }) {
  const order = [rows[1], rows[0], rows[2]].filter((row): row is Row => row !== undefined);
  const height: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-14" };

  return (
    <ol aria-label="Podio" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((row) => {
        const first = row.rank === 1;
        return (
          <li key={row.userId} className={`flex min-w-0 flex-col items-center gap-2 ${rows.length === 1 ? "col-start-2" : ""}`}>
            <Avatar seed={row.avatarSeed} parts={row.avatarParts} size={first ? 84 : 64} mood={first ? "happy" : "neutral"} />
            <div className="flex w-full min-w-0 flex-col items-center text-center">
              <span className={`w-full truncate font-semibold ${row.userId === viewerId ? "underline underline-offset-4" : ""}`}>
                {row.username}
              </span>
              <span className="tabular text-sm">{row.value}</span>
              {row.detail && <span className="text-xs text-muted">{row.detail}</span>}
            </div>
            <div
              className={`display grid w-full place-items-center rounded-t-2xl text-3xl font-bold ${height[row.rank] ?? "h-14"} ${
                first ? "bg-ink text-bg" : "bg-surface shadow-soft"
              }`}
            >
              {row.rank}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RankRow({ row, isViewer }: { row: Row; isViewer: boolean }) {
  return (
    <li className={`flex items-center gap-3 border-b border-line py-2.5 ${isViewer ? "-mx-3 rounded-2xl border-transparent bg-surface px-3 shadow-soft" : ""}`}>
      <span className="tabular w-8 text-right text-sm text-muted">{row.rank}º</span>
      <Avatar seed={row.avatarSeed} parts={row.avatarParts} size={34} />
      <span className="min-w-0 flex-1 truncate font-medium">
        {row.username}
        {isViewer && <span className="ml-2 text-xs font-normal text-muted">tú</span>}
      </span>
      <span className="flex flex-col items-end">
        <span className="tabular font-semibold">{row.value}</span>
        {row.detail && <span className="text-xs text-muted">{row.detail}</span>}
      </span>
    </li>
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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-line/60 p-1">
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
