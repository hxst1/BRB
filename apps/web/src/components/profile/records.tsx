import Link from "next/link";
import type { Functions } from "@repo/db";
import { formatNumber, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Standing = Functions<"get_my_standing">["Returns"][number] | null;

/** Juegos en solitario con ranking. Los de tiempo (gana el menor) tienen una fila por dificultad. */
const SOLO: { name: string; href: string; boards: { game: string; label?: string }[]; time?: boolean; unit?: string }[] = [
  { name: "2048", href: "/2048", boards: [{ game: "2048" }], unit: "puntos" },
  { name: "Snake", href: "/snake", boards: [{ game: "snake" }], unit: "puntos" },
  { name: "Lights Out", href: "/lights-out", boards: [{ game: "lightsout" }], unit: "niveles" },
  {
    name: "Buscaminas",
    href: "/buscaminas",
    time: true,
    boards: [
      { game: "minesweeper-easy", label: "Fácil" },
      { game: "minesweeper-medium", label: "Medio" },
      { game: "minesweeper-hard", label: "Difícil" },
    ],
  },
  {
    name: "Sudoku",
    href: "/sudoku",
    time: true,
    boards: [
      { game: "sudoku-easy", label: "Fácil" },
      { game: "sudoku-medium", label: "Medio" },
      { game: "sudoku-hard", label: "Difícil" },
    ],
  },
];

const MATCH_GAMES: { name: string; href: string; games: string[] }[] = [
  { name: "3 en raya", href: "/3-en-raya", games: ["tictactoe"] },
  { name: "4 en raya", href: "/4-en-raya", games: ["connect4"] },
  { name: "Hundir la flota", href: "/hundir-la-flota", games: ["battleship"] },
  { name: "Piedra, papel o tijera", href: "/piedra-papel-tijera", games: ["rps", "rpsls"] },
  { name: "Pong", href: "/pong", games: ["pong"] },
  { name: "Tron", href: "/tron", games: ["tron"] },
];

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** Tus récords: mejor marca y puesto en cada juego, Wordle y partidas contra amigos. */
export async function Records({ viewerId }: { viewerId: string }) {
  const supabase = await createClient();
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
    <div className="flex flex-col gap-10">
      <section aria-labelledby="records-solo" className="flex flex-col gap-3">
        <h2 id="records-solo" className="text-xl font-semibold">
          En solitario
        </h2>
        <ul className="flex flex-col">
          {SOLO.map((game) => (
            <li key={game.name} className="flex flex-col gap-1 border-b border-line py-3">
              <Link href={game.href} className="font-semibold hover:underline">
                {game.name}
              </Link>
              {game.boards.map((board) => {
                const row = standing.get(board.game);
                const best = row?.best_score;
                return (
                  <div key={board.game} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">{board.label ?? "Tu récord"}</span>
                    {best == null ? (
                      <span className="text-muted">Sin partidas</span>
                    ) : (
                      <span className="text-right">
                        <strong className="tabular">{game.time ? formatTime(best) : formatNumber(best)}</strong>
                        {!game.time && game.unit && ` ${game.unit}`}
                        <span className="block text-xs text-muted">
                          {row!.global_rank}º de {row!.global_players}
                          {row!.friends_players > 1 && `, ${row!.friends_rank}º entre amigos`}
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
              <span className="text-muted">Palabras acertadas</span>
              {wordle?.length ? (
                <span className="text-right">
                  <strong className="tabular">
                    {solved.length} de {wordle.length}
                  </strong>
                  {solved.length > 0 && (
                    <span className="block text-xs text-muted">
                      {average.toLocaleString("es-ES", { maximumFractionDigits: 1 })} intentos de media
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted">Sin partidas</span>
              )}
            </div>
          </li>
        </ul>
      </section>

      <section aria-labelledby="records-friends" className="flex flex-col gap-3">
        <h2 id="records-friends" className="text-xl font-semibold">
          Contra tus amigos
        </h2>
        <ul className="flex flex-col">
          {MATCH_GAMES.map((game) => {
            const played = (matches ?? []).filter((match) => game.games.includes(match.game));
            const mine = (match: (typeof played)[number]) => (match.player_x === viewerId ? "x" : "o");
            const won = played.filter((match) => match.winner === mine(match)).length;
            const draws = played.filter((match) => match.winner === null).length;
            const lost = played.length - won - draws;
            return (
              <li key={game.name} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <Link href={game.href} className="font-semibold hover:underline">
                  {game.name}
                </Link>
                {played.length === 0 ? (
                  <span className="text-sm text-muted">Sin partidas</span>
                ) : (
                  <span className="text-right text-sm">
                    <strong className="tabular">{plural(won, "victoria", "victorias")}</strong>
                    <span className="block text-xs text-muted">
                      {plural(lost, "derrota", "derrotas")}
                      {draws > 0 && `, ${plural(draws, "empate", "empates")}`}, {Math.round((won / played.length) * 100)} % ganadas
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
