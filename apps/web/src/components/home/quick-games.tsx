import Link from "next/link";
import { DragScrollList } from "@/components/drag-scroll";
import { GameTile } from "@/components/news/game-tile";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { guidesFor } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

/** Cuántos juegos salen en la fila (el resto, en /juegos). */
const MAX = 10;

/** Id de la partida guardada (game_runs, matches) al id del juego en lib/seo.ts. */
function guideOf(game: string): string {
  if (game === "lightsout") return "lights-out";
  if (game === "rpsls") return "rps";
  return game.replace(/-(easy|medium|hard)$/, "");
}

/**
 * Los juegos a un toque, nada más entrar: primero los fijados, luego los
 * últimos que has jugado y después el resto, en una fila que se desliza.
 * El catálogo completo, con tus datos, está en /juegos.
 */
export async function QuickGames({ viewerId }: { viewerId: string }) {
  const [supabase, m, locale] = await Promise.all([createClient(), getMessages(), getLocale()]);
  const [{ data: pins }, { data: runs }, { data: matches }, { data: wordle }] = await Promise.all([
    supabase.from("pinned_games").select("game").order("pinned_at"),
    supabase.from("game_runs").select("game, started_at").eq("user_id", viewerId).order("started_at", { ascending: false }).limit(40),
    supabase.from("matches").select("game, updated_at").order("updated_at", { ascending: false }).limit(20),
    supabase.from("wordle_games").select("day").eq("user_id", viewerId).order("day", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const recent = [
    ...(runs ?? []).map((run) => ({ game: guideOf(run.game), at: run.started_at })),
    ...(matches ?? []).map((match) => ({ game: guideOf(match.game), at: match.updated_at })),
    ...(wordle ? [{ game: "wordle", at: `${wordle.day}T12:00:00Z` }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const guides = guidesFor(locale);
  const order = [...new Set([...(pins ?? []).map((pin) => pin.game), ...recent.map((item) => item.game), ...guides.map((game) => game.id)])];
  const games = order.flatMap((id) => guides.find((game) => game.id === id) ?? []).slice(0, MAX);

  return (
    <section aria-labelledby="quick-games-title" className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="quick-games-title" className="text-xl font-semibold">
          {m.quickGames.title}
        </h2>
        <Link href="/juegos" className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          {m.quickGames.all}
        </Link>
      </div>
      <DragScrollList className="no-scrollbar -mx-4 flex cursor-grab snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pt-1 pb-2 active:cursor-grabbing sm:mx-0 sm:px-0">
        {games.map((game) => (
          <li key={game.id} className="shrink-0 snap-start">
            <Link href={game.path} className="flex w-18 flex-col items-center gap-1.5 text-center">
              <span className="rounded-2xl shadow-soft transition-transform hover:-translate-y-0.5">
                <GameTile game={game.id} accent={game.accent} />
              </span>
              <span className="line-clamp-2 text-xs leading-tight font-medium">{game.name}</span>
            </Link>
          </li>
        ))}
      </DragScrollList>
    </section>
  );
}
