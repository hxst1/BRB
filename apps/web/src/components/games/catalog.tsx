import type { Functions } from "@repo/db";
import { GameCards, type GameId } from "@/components/home/game-cards";
import { gameDay } from "@/lib/daily";
import type { Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { myTurnIn, waitingOnRival } from "@/lib/match-turns";
import { MATCH_WITH_PLAYERS } from "@/lib/queries";
import type { Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type GameTally = { myTurn: number; invites: number; waiting: number };

/** Juegos contra amigos con su línea de partidas en la tarjeta (rpsls va con rps). */
const MATCH_CARDS = ["tictactoe", "connect4", "battleship", "rps", "pong", "tron", "chess", "reversi", "dots", "typing"] as const;

/**
 * Todos los juegos en tarjetas. Con sesión, cada una con tus datos (récord y
 * puesto, o tus partidas en juego) y la chincheta para fijarla.
 */
export async function GamesCatalog({ viewer }: { viewer: Viewer | null }) {
  if (!viewer) return <GameCards />;

  const supabase = await createClient();
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const standing = (game: string) => supabase.rpc("get_my_standing", { game }).maybeSingle();
  const [
    { data: s2048 },
    { data: snake },
    { data: lightsOut },
    { data: minesweeper },
    { data: sudoku },
    { data: solitaire },
    { data: queens },
    { data: wordle },
    { data: pins },
    { data: matches },
  ] = await Promise.all([
    standing("2048"),
    standing("snake"),
    standing("lightsout"),
    standing("minesweeper-medium"),
    standing("sudoku-medium"),
    standing("solitaire"),
    standing("queens-medium"),
    supabase
      .from("wordle_games")
      .select("day, guesses, solved, finished_at")
      .eq("user_id", viewer.id)
      .eq("lang", locale)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("pinned_games").select("game").order("pinned_at"),
    supabase.from("matches").select(MATCH_WITH_PLAYERS).in("status", ["pending", "active"]),
  ]);

  const waiting = await waitingOnRival(supabase, matches ?? [], viewer.id);
  const tally = Object.fromEntries(MATCH_CARDS.map((game) => [game, { myTurn: 0, invites: 0, waiting: 0 }])) as Record<
    (typeof MATCH_CARDS)[number],
    GameTally
  >;
  for (const match of matches ?? []) {
    const counts = tally[(match.game === "rpsls" ? "rps" : match.game) as keyof typeof tally];
    if (!counts) continue;
    if (match.status === "pending") {
      if (match.created_by !== viewer.id) counts.invites++;
      else counts.waiting++;
    } else if (myTurnIn(match, viewer.id, waiting)) counts.myTurn++;
    else counts.waiting++;
  }

  const time = m.format.time;
  const medium = (ms: number) => m.home.onMedium(time(ms));
  // Solo cuenta la partida de hoy.
  const wordleToday = wordle && wordle.day === gameDay() ? wordle : null;
  const stats: Partial<Record<GameId, React.ReactNode>> = {
    "2048": <SoloStats m={m} standing={s2048} />,
    snake: <SoloStats m={m} standing={snake} />,
    "lights-out": <SoloStats m={m} standing={lightsOut} unit={m.home.levels} />,
    minesweeper: <SoloStats m={m} standing={minesweeper} format={medium} />,
    sudoku: <SoloStats m={m} standing={sudoku} format={medium} />,
    solitaire: <SoloStats m={m} standing={solitaire} format={time} />,
    queens: <SoloStats m={m} standing={queens} format={medium} />,
    wordle: wordleToday?.finished_at ? (
      <span>
        {m.home.today} <strong className="tabular">{wordleToday.solved ? wordleToday.guesses.length : "X"}/6</strong>
      </span>
    ) : wordleToday ? (
      <strong>{m.home.wordleHalfway}</strong>
    ) : (
      <span className="text-muted">{m.home.wordleNotYet}</span>
    ),
    ...Object.fromEntries(MATCH_CARDS.map((game) => [game, <MatchStats key={game} m={m} counts={tally[game]} />])),
  };

  return <GameCards pinned={(pins ?? []).map((pin) => pin.game)} stats={stats} />;
}

/** Récord y puesto en un juego en solitario. */
function SoloStats({
  m,
  standing,
  unit,
  format = m.format.number,
}: {
  m: Messages;
  standing: Functions<"get_my_standing">["Returns"][number] | null;
  /** Unidad tras el récord (p. ej. niveles); sin ella, solo el número. */
  unit?: (score: number) => string;
  /** Si el récord es un tiempo, cómo mostrarlo. */
  format?: (score: number) => string;
}) {
  if (standing?.best_score == null) return <span className="text-muted">{m.home.noScore}</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span>
        {m.home.yourRecord} <strong className="tabular">{format(standing.best_score)}</strong>
        {unit && ` ${unit(standing.best_score)}`}
      </span>
      <span className="text-muted">
        {m.home.worldRank(standing.global_rank, standing.global_players)}
        {standing.friends_players > 1 && m.home.friendsRank(standing.friends_rank)}
      </span>
    </span>
  );
}

function MatchStats({ m, counts }: { m: Messages; counts: GameTally }) {
  if (counts.myTurn > 0) return <strong>{m.home.yourTurnIn(counts.myTurn)}</strong>;
  if (counts.invites > 0) return <strong>{m.home.unansweredInvites(counts.invites)}</strong>;
  if (counts.waiting > 0) return <span className="text-muted">{m.home.waitingRival(counts.waiting)}</span>;
  return <span className="text-muted">{m.home.noMatches}</span>;
}
