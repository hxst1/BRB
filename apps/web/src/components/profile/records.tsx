import Link from "next/link";
import type { Functions } from "@repo/db";
import type { GameId } from "@/components/home/game-cards";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

type Standing = Functions<"get_my_standing">["Returns"][number] | null;

/** Juegos en solitario con ranking. Los de tiempo (gana el menor) tienen una fila por dificultad. */
type Level = "easy" | "medium" | "hard";

/** `id`: clave del nombre en m.gameCards. */
const SOLO: { id: GameId; href: string; boards: { game: string; level?: Level }[]; time?: boolean; unit?: "points" | "levels" }[] = [
  { id: "2048", href: "/2048", boards: [{ game: "2048" }], unit: "points" },
  { id: "snake", href: "/snake", boards: [{ game: "snake" }], unit: "points" },
  { id: "lights-out", href: "/lights-out", boards: [{ game: "lightsout" }], unit: "levels" },
  {
    id: "minesweeper",
    href: "/buscaminas",
    time: true,
    boards: [
      { game: "minesweeper-easy", level: "easy" },
      { game: "minesweeper-medium", level: "medium" },
      { game: "minesweeper-hard", level: "hard" },
    ],
  },
  {
    id: "sudoku",
    href: "/sudoku",
    time: true,
    boards: [
      { game: "sudoku-easy", level: "easy" },
      { game: "sudoku-medium", level: "medium" },
      { game: "sudoku-hard", level: "hard" },
    ],
  },
];

const MATCH_GAMES: { id: GameId; href: string; games: string[] }[] = [
  { id: "tictactoe", href: "/3-en-raya", games: ["tictactoe"] },
  { id: "connect4", href: "/4-en-raya", games: ["connect4"] },
  { id: "battleship", href: "/hundir-la-flota", games: ["battleship"] },
  { id: "rps", href: "/piedra-papel-tijera", games: ["rps", "rpsls"] },
  { id: "pong", href: "/pong", games: ["pong"] },
  { id: "tron", href: "/tron", games: ["tron"] },
];

/** Tus récords: mejor marca y puesto en cada juego, Wordle y partidas contra amigos. */
export async function Records({ viewerId }: { viewerId: string }) {
  const [supabase, m, locale] = await Promise.all([createClient(), getMessages(), getLocale()]);
  const t = m.records;
  const boards = SOLO.flatMap((game) => game.boards.map((board) => board.game));
  const [standings, { data: wordle }, { data: matches }] = await Promise.all([
    Promise.all(boards.map((game) => supabase.rpc("get_my_standing", { game }).maybeSingle().then(({ data }) => [game, data] as const))),
    supabase.from("wordle_games").select("solved, guesses, finished_at").eq("user_id", viewerId).not("finished_at", "is", null),
    supabase
      .from("matches")
      .select("game, player_x, player_o, winner")
      .eq("status", "finished")
      .or(`player_x.eq.${viewerId},player_o.eq.${viewerId}`),
  ]);
  const standing = new Map<string, Standing>(standings);

  const solved = (wordle ?? []).filter((game) => game.solved);
  const average = solved.length ? solved.reduce((sum, game) => sum + game.guesses.length, 0) / solved.length : 0;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="records-solo" className="flex flex-col gap-3">
        <h2 id="records-solo" className="text-xl font-semibold">
          {m.gameCards.soloTitle}
        </h2>
        <ul className="flex flex-col">
          {SOLO.map((game) => (
            <li key={game.id} className="flex flex-col gap-1 border-b border-line py-3">
              <Link href={game.href} className="font-semibold hover:underline">
                {m.gameCards[game.id].title}
              </Link>
              {game.boards.map((board) => {
                const row = standing.get(board.game);
                const best = row?.best_score;
                return (
                  <div key={board.game} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">{board.level ? m.levels[board.level] : m.run.yourRecord}</span>
                    {best == null ? (
                      <span className="text-muted">{t.none}</span>
                    ) : (
                      <span className="text-right">
                        <strong className="tabular">{game.time ? m.format.time(best) : m.format.number(best)}</strong>
                        {!game.time && game.unit && ` ${t[game.unit]}`}
                        <span className="block text-xs text-muted">
                          {m.daily.rank(row!.global_rank, row!.global_players)}
                          {row!.friends_players > 1 && t.amongFriends(row!.friends_rank)}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
          <li className="flex flex-col gap-1 py-3">
            <Link href="/wordle" className="font-semibold hover:underline">
              Wordle
            </Link>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{t.wordsGuessed}</span>
              {wordle?.length ? (
                <span className="text-right">
                  <strong className="tabular">
                    {t.of(solved.length, wordle.length)}
                  </strong>
                  {solved.length > 0 && (
                    <span className="block text-xs text-muted">
                      {t.average(average.toLocaleString(locale, { maximumFractionDigits: 1 }))}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted">{t.none}</span>
              )}
            </div>
          </li>
        </ul>
      </section>

      <section aria-labelledby="records-friends" className="flex flex-col gap-3">
        <h2 id="records-friends" className="text-xl font-semibold">
          {m.gameCards.friendsTitle}
        </h2>
        <ul className="flex flex-col">
          {MATCH_GAMES.map((game) => {
            const played = (matches ?? []).filter((match) => game.games.includes(match.game));
            const mine = (match: (typeof played)[number]) => (match.player_x === viewerId ? "x" : "o");
            const won = played.filter((match) => match.winner === mine(match)).length;
            const draws = played.filter((match) => match.winner === null).length;
            const lost = played.length - won - draws;
            return (
              <li key={game.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <Link href={game.href} className="font-semibold hover:underline">
                  {m.gameCards[game.id].title}
                </Link>
                {played.length === 0 ? (
                  <span className="text-sm text-muted">{t.none}</span>
                ) : (
                  <span className="text-right text-sm">
                    <strong className="tabular">{t.wins(m.format.number(won), won)}</strong>
                    <span className="block text-xs text-muted">
                      {t.losses(m.format.number(lost), lost)}
                      {draws > 0 && `, ${t.draws(m.format.number(draws), draws)}`}, {t.winRate(Math.round((won / played.length) * 100))}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
