import Link from "next/link";
import type { DailyStatus } from "@repo/db";
import { DragScrollList } from "@/components/drag-scroll";
import { GameTile } from "@/components/news/game-tile";
import { DAILY_GAMES, dailyGameName, formatDailyScore, type DailySlot } from "@/lib/daily";
import { matchGame, matchGameKey } from "@/lib/games";
import type { Messages } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";
import { GAME_GUIDES } from "@/lib/seo";

/** Un reto de hoy. Sin sesión, `status` es null (solo se enseña qué toca). */
export type DailyCardData = { slot: DailySlot; game: string; status: DailyStatus["status"] | null; score: number | null; rank: number | null; players: number | null };

const ORDER: DailySlot[] = ["puzzle", "arcade", "wordle", "duel"];

/** Id del juego en lib/seo.ts (su icono y su color). */
function guideId(slot: DailySlot, game: string): string {
  if (slot === "wordle") return "wordle";
  if (slot === "duel") return game;
  return DAILY_GAMES[game]?.guide ?? game;
}

function href(card: DailyCardData): string {
  if (card.slot === "wordle") return "/wordle";
  if (card.slot === "duel") return matchGame(card.game).path;
  // "Jugar" ya es pedir empezar; ver el resultado, no.
  return card.status === "available" ? `/reto-diario?reto=${card.slot}&empezar=1#jugar` : `/reto-diario?reto=${card.slot}#jugar`;
}

/**
 * Los retos de hoy, en fila (con scroll horizontal en el móvil): puzle,
 * arcade, Wordle y duelo con amigos, cada uno con su estado y su botón.
 * `selected`: el que se está jugando en la página del reto.
 */
export async function DailyCards({ cards, selected, title = true }: { cards: DailyCardData[]; selected?: DailySlot; title?: boolean }) {
  const m = await getMessages();
  const sorted = ORDER.flatMap((slot) => cards.filter((card) => card.slot === slot));
  const signedIn = sorted.some((card) => card.status !== null);
  const done = sorted.filter((card) => card.status === "finished").length;

  return (
    <section aria-labelledby={title ? "dailies-title" : undefined} aria-label={title ? undefined : m.dailies.title} className="flex flex-col gap-3">
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="dailies-title" className="text-xl font-semibold">
            {m.dailies.title}
          </h2>
          {signedIn && (
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="tabular font-semibold text-ink">{m.dailies.done(done, sorted.length)}</span>
              <span aria-hidden className="flex gap-1">
                {sorted.map((card) => (
                  <span key={card.slot} className={`h-1.5 w-4 rounded-full ${card.status === "finished" ? "bg-ink" : "bg-line"}`} />
                ))}
              </span>
            </span>
          )}
        </div>
      )}
      <DragScrollList className="no-scrollbar -mx-4 flex cursor-grab snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 active:cursor-grabbing lg:mx-0 lg:grid lg:cursor-auto lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {sorted.map((card) => (
          <li key={card.slot} className="w-[clamp(14rem,68%,16rem)] shrink-0 snap-start lg:w-auto">
            <Card card={card} m={m} selected={selected === card.slot} />
          </li>
        ))}
      </DragScrollList>
    </section>
  );
}

function Card({ card, m, selected }: { card: DailyCardData; m: Messages; selected: boolean }) {
  const t = m.dailies;
  const guide = GAME_GUIDES.find((game) => game.id === guideId(card.slot, card.game));
  const name =
    card.slot === "wordle" ? "Wordle" : card.slot === "duel" ? m.matchGames[matchGameKey(card.game)] : dailyGameName(card.game, m, true);
  const finished = card.status === "finished";
  const used = card.status === "rejected" || card.status === "abandoned";

  return (
    <article
      className={`relative flex h-full flex-col gap-3 rounded-3xl bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift ${selected ? "ring-2 ring-ink" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <GameTile game={guide?.id ?? card.game} accent={guide?.accent ?? "#adb5bd"} />
        {finished && (
          <span className="grid size-7 place-items-center rounded-full bg-ink text-sm font-bold text-bg" aria-label={t.completed}>
            ✓
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold text-muted">{t.slots[card.slot]}</span>
        <h3 className="display text-2xl leading-tight font-bold">{name}</h3>
        <p className="text-sm text-muted">{status(card, m)}</p>
      </div>
      <Link
        href={href(card)}
        className={`self-start rounded-full px-4 py-2 text-sm font-semibold after:absolute after:inset-0 after:rounded-3xl ${
          finished || used ? "border border-line" : "bg-ink text-bg"
        }`}
      >
        {action(card, m)}
      </Link>
    </article>
  );
}

function status(card: DailyCardData, m: Messages): string {
  const t = m.dailies;
  if (card.slot === "duel") return card.status === "finished" ? t.duelDone : t.duelTodo;
  if (card.slot === "wordle") {
    if (card.status === "finished") return card.score ? t.wordleSolved(card.score) : t.wordleMissed;
    return card.status === "playing" ? t.wordleHalfway : t.wordleTodo;
  }
  if (card.status === "finished" && card.score !== null) {
    const result = formatDailyScore(card.game, card.score, m);
    return card.rank && card.players ? `${result} · ${m.daily.rank(card.rank, card.players)}` : result;
  }
  if (card.status === "playing") return t.playing;
  if (card.status === "rejected" || card.status === "abandoned") return t.used;
  return t.oneTry;
}

function action(card: DailyCardData, m: Messages): string {
  const t = m.dailies;
  if (card.slot === "duel") return card.status === "finished" ? t.playAgain : t.challenge;
  if (card.slot === "wordle") return card.status === "finished" ? t.see : t.play;
  if (card.status === "playing") return t.continue;
  if (card.status === null || card.status === "available") return t.play;
  return t.ranking;
}
