"use client";

import type { GameId } from "@/components/home/game-cards";
import { useMessages } from "@/lib/i18n/client";

export type GameRatingItem = { game: string; rating: number | null; comment: string | null; updated_at: string };

/** Perfil, pestaña Opinión: lo que has respondido de cada juego (se pregunta a la 3.ª partida). */
export function GameRatings({ items }: { items: GameRatingItem[] }) {
  const m = useMessages();
  const t = m.feedbackSection;

  return (
    <section aria-labelledby="game-ratings-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div>
        <h2 id="game-ratings-title" className="font-semibold">
          {t.gameRatings}
        </h2>
        <p className="text-sm text-muted">{t.gameRatingsIntro}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t.gameRatingsEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.game} className="flex flex-col gap-1 border-b border-line py-2.5 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{m.gameCards[item.game as GameId]?.title ?? item.game}</span>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "var(--cell)" }}>
                  {item.rating ? t.answers[item.rating] : ""}
                </span>
              </div>
              {item.comment && <p className="line-clamp-3 text-sm text-muted">{item.comment}</p>}
              <span className="text-xs text-muted">{m.format.ago(item.updated_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
