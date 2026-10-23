"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { useDragScroll } from "@/components/drag-scroll";
import type { Messages } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/client";
import { levelFromXp } from "@repo/games/level";
import { createClient } from "@/lib/supabase/client";

type GameId = "2048" | "snake" | "lightsout" | "minesweeper" | "sudoku" | "tictactoe" | "connect4" | "battleship" | "rps" | "pong" | "tron";
type Category = "level" | GameId;
type Difficulty = "easy" | "medium" | "hard";
type Scope = "global" | "friends";
type Period = "all" | "week";

type Row = {
  rank: number;
  userId: string;
  username: string;
  avatarSeed: number;
  avatarParts: Json;
  supporter: boolean;
  /** Dato principal (nivel, puntos, victorias). */
  value: string;
  /** Detalle secundario (XP, partidas, porcentaje). */
  detail?: string;
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Juegos con ranking. Para añadir uno nuevo basta una entrada aquí: `games`
 * son los valores de `matches.game` que suma (piedra, papel o tijera junta
 * sus dos variantes); sin `games`, es un juego en solitario con puntuación.
 * `levels` da el id del ranking de cada dificultad (un ranking por cada una).
 */
type RankedGame = {
  /** El nombre está en m.rankingBoard.games. */
  id: GameId;
  icon: ReactNode;
  games?: string[];
  levels?: Record<Difficulty, string>;
  unit?: "points" | "levels";
  /** Si la puntuación es un tiempo (gana el menor). */
  time?: boolean;
};

const RANKED_GAMES: RankedGame[] = [
  {
    id: "2048",
    icon: (
      <span className="grid size-4 grid-cols-2 gap-px">
        {[8, 64, 512, 2048].map((value) => (
          <span key={value} className="rounded-[2px]" style={{ background: `var(--t${value})` }} />
        ))}
      </span>
    ),
  },
  {
    id: "snake",
    icon: (
      <span className="flex gap-px">
        {["var(--t512)", "var(--t512)", "var(--t1024)"].map((color, i) => (
          <span key={i} className="size-[5px] rounded-[1.5px]" style={{ background: color }} />
        ))}
      </span>
    ),
  },
  {
    id: "lightsout",
    unit: "levels",
    icon: (
      <span className="grid size-4 grid-cols-2 gap-px">
        {[true, false, false, true].map((on, i) => (
          <span key={i} className="rounded-[2px]" style={{ background: on ? "var(--t128)" : "var(--t4)" }} />
        ))}
      </span>
    ),
  },
  {
    id: "minesweeper",
    icon: "💣",
    levels: { easy: "minesweeper-easy", medium: "minesweeper-medium", hard: "minesweeper-hard" },
    time: true,
  },
  {
    id: "sudoku",
    icon: "🔢",
    levels: { easy: "sudoku-easy", medium: "sudoku-medium", hard: "sudoku-hard" },
    time: true,
  },
  {
    id: "tictactoe",
    games: ["tictactoe"],
    icon: (
      <span className="font-bold">
        <span style={{ color: "var(--mark-x)" }}>×</span>
        <span style={{ color: "var(--mark-o)" }}>○</span>
      </span>
    ),
  },
  {
    id: "connect4",
    games: ["connect4"],
    icon: (
      <span className="flex gap-px">
        {["var(--mark-x)", "var(--mark-o)"].map((color) => (
          <span key={color} className="size-[7px] rounded-full" style={{ background: color }} />
        ))}
      </span>
    ),
  },
  { id: "battleship", games: ["battleship"], icon: "🚢" },
  { id: "rps", games: ["rps", "rpsls"], icon: "✂️" },
  { id: "pong", games: ["pong"], icon: "🏓" },
  { id: "tron", games: ["tron"], icon: "🏍️" },
];

const MAX_ROWS = 50;

async function loadRows(m: Messages, category: Category, difficulty: Difficulty, scope: Scope, period: Period): Promise<Row[]> {
  const { number, time } = m.format;
  const supabase = createClient();

  if (category === "level") {
    const { data } = await supabase.rpc("get_level_leaderboard", { scope, max_rows: MAX_ROWS });
    return (data ?? []).map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      username: r.username,
      avatarSeed: r.avatar_seed,
      avatarParts: r.avatar_parts,
      supporter: r.supporter_tier !== null,
      value: m.level.level(levelFromXp(r.xp).level),
      detail: `${number(r.xp)} XP`,
    }));
  }

  const ranked = RANKED_GAMES.find((g) => g.id === category);
  if (ranked && !ranked.games) {
    const game = ranked.levels ? ranked.levels[difficulty] : category;
    const { data } = await supabase.rpc("get_leaderboard", { game, scope, period, max_rows: MAX_ROWS });
    return (data ?? []).map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      username: r.username,
      avatarSeed: r.avatar_seed,
      avatarParts: r.avatar_parts,
      supporter: r.supporter_tier !== null,
      value: ranked.time ? time(r.score) : number(r.score),
      detail: ranked.time ? "" : m.records[ranked.unit ?? "points"],
    }));
  }

  const games = ranked?.games ?? [category];
  const { data } = await supabase.rpc("get_match_leaderboard", { games, scope, period, max_rows: MAX_ROWS });
  return (data ?? []).map((r) => ({
    rank: r.rank,
    userId: r.user_id,
    username: r.username,
    avatarSeed: r.avatar_seed,
    avatarParts: r.avatar_parts,
    supporter: r.supporter_tier !== null,
    value: m.records.wins(number(r.wins), r.wins),
    detail: m.rankingBoard.played(r.played, Math.round((r.wins / r.played) * 100)),
  }));
}

export function RankingBoard({ viewerId }: { viewerId: string | null }) {
  const m = useMessages();
  const t = m.rankingBoard;
  const [category, setCategory] = useState<Category>("level");
  // Al volver a "Juegos" se recupera el último juego elegido.
  const [lastGame, setLastGame] = useState<GameId>("2048");
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("all");
  // Compartida por los juegos con dificultades (buscaminas y sudoku).
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [result, setResult] = useState<{ key: string; rows: Row[] } | null>(null);

  const hasPeriod = category !== "level";
  const effectivePeriod = hasPeriod ? period : "all";
  const hasLevels = RANKED_GAMES.some((game) => game.id === category && game.levels);
  const key = `${category}:${hasLevels ? difficulty : ""}:${scope}:${effectivePeriod}`;

  useEffect(() => {
    let cancelled = false;
    loadRows(m, category, difficulty, scope, effectivePeriod).then((rows) => {
      if (!cancelled) setResult({ key, rows });
    });
    return () => {
      cancelled = true;
    };
  }, [m, category, difficulty, scope, effectivePeriod, key]);

  const rows = result?.key === key ? result.rows : null;
  // El usuario puede venir al final aunque no esté en el top.
  const top = rows?.filter((row) => row.rank <= MAX_ROWS) ?? [];
  const extraMe = rows?.find((row) => row.rank > MAX_ROWS && row.userId === viewerId) ?? null;
  const podium = top.filter((row) => row.rank <= 3).slice(0, 3);
  const rest = top.slice(podium.length);

  return (
    <div className="flex flex-col gap-6">
      <Toggle
        label={t.rankingOf}
        value={category === "level" ? "level" : "games"}
        onChange={(value) => setCategory(value === "level" ? "level" : lastGame)}
        options={[
          { value: "level", label: t.level },
          { value: "games", label: t.games },
        ]}
        wide
      />

      {category !== "level" && (
        <GamePicker
          value={category}
          onChange={(id) => {
            setCategory(id);
            setLastGame(id);
          }}
        />
      )}

      {hasLevels && (
        <div className="-mt-2 flex justify-center">
          <Toggle label={m.levels.label} value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((value) => ({ value, label: m.levels[value] }))} />
        </div>
      )}

      {(viewerId || hasPeriod) && (
        <div className="flex items-center justify-between gap-2">
          {viewerId ? (
            <Toggle
              label={m.ranking.players}
              value={scope}
              onChange={setScope}
              options={[
                { value: "global", label: t.global },
                { value: "friends", label: m.ranking.friends },
              ]}
            />
          ) : (
            <span />
          )}
          {hasPeriod && (
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
      )}

      {rows === null ? (
        <div className="h-64 animate-pulse rounded-3xl bg-line/40" />
      ) : top.length === 0 ? (
        <p className="py-10 text-center text-muted">
          {scope === "friends"
            ? t.emptyFriends
            : effectivePeriod === "week"
              ? t.emptyWeek
              : t.empty}
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

/**
 * Fila de juegos. Se puede deslizar (dedo, rueda o arrastrando con el ratón),
 * cambiar con las flechas ‹ › o con el teclado (← → Inicio Fin, como unas
 * pestañas). El juego elegido siempre queda a la vista.
 */
function GamePicker({ value, onChange }: { value: GameId; onChange: (id: GameId) => void }) {
  const m = useMessages();
  const list = useRef<HTMLDivElement>(null);
  // Qué lados tienen más juegos por ver (solo esos se difuminan).
  const [edges, setEdges] = useState({ left: false, right: false });
  const index = RANKED_GAMES.findIndex((game) => game.id === value);
  const last = RANKED_GAMES.length - 1;

  useEffect(() => {
    list.current
      ?.querySelector(`[data-game="${value}"]`)
      // Centrado: así nunca queda bajo el difuminado de los bordes.
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value]);

  function updateEdges() {
    const element = list.current;
    if (!element) return;
    const left = element.scrollLeft > 4;
    const right = element.scrollLeft + element.clientWidth < element.scrollWidth - 4;
    setEdges((current) => (current.left === left && current.right === right ? current : { left, right }));
  }

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, []);

  function select(position: number, focus: boolean) {
    const game = RANKED_GAMES[position];
    if (!game) return;
    onChange(game.id);
    if (focus) list.current?.querySelector<HTMLElement>(`[data-game="${game.id}"]`)?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  }

  const dragHandlers = useDragScroll(list);

  const arrow = "grid size-9 shrink-0 place-items-center rounded-full bg-surface text-lg shadow-soft transition-opacity disabled:opacity-30";

  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={m.rankingBoard.previous} disabled={index === 0} onClick={() => select(index - 1, false)} className={arrow}>
        <Chevron direction="left" />
      </button>
      <div
        ref={list}
        role="tablist"
        aria-label={m.rankingBoard.game}
        onKeyDown={onKeyDown}
        {...dragHandlers}
        onScroll={updateEdges}
        className={`no-scrollbar ${edges.left && edges.right ? "fade-lr" : edges.left ? "fade-l" : edges.right ? "fade-r" : ""} flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto py-1 select-none cursor-grab active:cursor-grabbing`}
      >
        {RANKED_GAMES.map((game) => {
          const active = game.id === value;
          return (
            <button
              key={game.id}
              data-game={game.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(game.id)}
              className={`flex shrink-0 snap-center items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? "bg-ink text-bg" : "bg-surface text-muted shadow-soft hover:text-ink"
              }`}
            >
              <span aria-hidden className="grid place-items-center leading-none">
                {game.icon}
              </span>
              {m.rankingBoard.names[game.id]}
            </button>
          );
        })}
      </div>
      <button type="button" aria-label={m.rankingBoard.next} disabled={index === last} onClick={() => select(index + 1, false)} className={arrow}>
        <Chevron direction="right" />
      </button>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
    </svg>
  );
}

/** Los tres primeros, con sus monstruos (el primero en el centro y más alto). */
function Podium({ rows, viewerId }: { rows: Row[]; viewerId: string | null }) {
  const m = useMessages();
  const order = [rows[1], rows[0], rows[2]].filter((row): row is Row => row !== undefined);
  const height: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-14" };

  return (
    <ol aria-label={m.rankingBoard.podium} className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((row) => {
        const first = row.rank === 1;
        return (
          <li key={row.userId} className={`flex min-w-0 flex-col items-center gap-2 ${rows.length === 1 ? "col-start-2" : ""}`}>
            <Avatar seed={row.avatarSeed} parts={row.avatarParts} size={first ? 84 : 64} mood={first ? "happy" : "neutral"} />
            <div className="flex w-full min-w-0 flex-col items-center text-center">
              <span className={`w-full truncate font-semibold ${row.userId === viewerId ? "underline underline-offset-4" : ""}`}>
                {row.username}
                {row.supporter && <SupporterMark />}
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
  const m = useMessages();
  return (
    <li className={`flex items-center gap-3 border-b border-line py-2.5 ${isViewer ? "-mx-3 rounded-2xl border-transparent bg-surface px-3 shadow-soft" : ""}`}>
      <span className="tabular w-8 text-right text-sm text-muted">{row.rank}º</span>
      <Avatar seed={row.avatarSeed} parts={row.avatarParts} size={34} />
      <span className="min-w-0 flex-1 truncate font-medium">
        {row.username}
        {row.supporter && <SupporterMark />}
        {isViewer && <span className="ml-2 text-xs font-normal text-muted">{m.common.you}</span>}
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
  wide = false,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Ocupa todo el ancho, con las opciones repartidas. */
  wide?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`${wide ? "grid grid-flow-col auto-cols-fr" : "inline-flex"} rounded-full bg-line/60 p-1`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 ${wide ? "py-2" : "py-1"} text-sm transition-colors ${
            value === option.value ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SupporterMark() {
  const m = useMessages();
  return (
    <span title={m.common.supporter} aria-label={`(${m.common.supporter.toLowerCase()})`} className="ml-1 text-[0.8em]" style={{ color: "var(--t256)" }}>
      ✦
    </span>
  );
}
