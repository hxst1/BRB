"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useMessages } from "@/lib/i18n/client";
import { guidesFor, type GameGuide } from "@/lib/seo";
import { createClient } from "@/lib/supabase/client";

/** Solo se anuncian los juegos de los últimos 90 días (más viejos ya no son novedad). */
const WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
/** Espera tras cargar, para no saltar encima de lo primero que se ve. */
const DELAY_MS = 1200;

/**
 * Aviso de juegos nuevos: los publicados después de crear la cuenta que aún
 * no ha visto. Si salieron varios desde su última visita, salen todos juntos.
 * Al cerrarlo o al ir a jugar, quedan vistos (en su cuenta, no en el navegador).
 */
export function NewGamesPopup({ viewerId }: { viewerId: string }) {
  const [games, setGames] = useState<GameGuide[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const locale = useLocale();
  const m = useMessages();

  useEffect(() => {
    const since = Date.now() - WINDOW_MS;
    const candidates = guidesFor(locale).filter((game) => Date.parse(game.addedAt) > since);
    if (candidates.length === 0) return;

    let cancelled = false;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const [{ data: seen }, { data: profile }] = await Promise.all([
        supabase.from("seen_announcements").select("announcement").in("announcement", candidates.map((game) => game.id)),
        supabase.from("profiles").select("created_at").eq("id", viewerId).maybeSingle(),
      ]);
      if (cancelled || !profile) return;
      const seenIds = new Set((seen ?? []).map((row) => row.announcement));
      const joined = Date.parse(profile.created_at);
      // Los más nuevos primero.
      const fresh = candidates
        .filter((game) => !seenIds.has(game.id) && Date.parse(game.addedAt) > joined)
        .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
      // Si hay otro aviso abierto (p. ej. el de instalar), se espera a otra visita.
      if (fresh.length > 0 && !document.querySelector("[role=dialog][aria-modal=true]")) setGames(fresh);
    }, DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [viewerId, locale]);

  useEffect(() => {
    if (games.length === 0) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss(games);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [games]);

  function dismiss(shown: GameGuide[]) {
    setGames([]);
    void createClient()
      .rpc("mark_announcements_seen", { ids: shown.map((game) => game.id) })
      .then(() => undefined);
  }

  if (games.length === 0) return null;
  const single = games.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={() => dismiss(games)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={() => dismiss(games)}
          aria-label={m.common.close}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="pr-8">
          <p className="text-sm text-muted">{m.news.sinceLastVisit}</p>
          <h2 id="news-title" className="display text-3xl leading-tight font-bold">
            {single ? m.news.newGame : m.news.newGames(games.length)}
          </h2>
        </div>

        <ul className="flex flex-col gap-3">
          {games.map((game) => (
            <li key={game.id} className="flex items-center gap-3 rounded-3xl p-3" style={{ background: "var(--cell)" }}>
              <GameTile accent={game.accent} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="display text-2xl leading-tight font-bold">{game.name}</span>
                <span className="text-sm text-muted">{game.tagline}</span>
                <span className="text-xs text-muted">{game.mode === "solo" ? m.news.solo : m.news.withFriends}</span>
              </span>
              <Link
                href={game.path}
                onClick={() => dismiss(games)}
                className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg"
              >
                {m.common.play}
              </Link>
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => dismiss(games)} className="self-center text-sm text-muted hover:text-ink">
          {m.common.later}
        </button>
      </div>
    </div>
  );
}

/** Miniatura con el color del juego: un tablero de 3 × 3 con la casilla central encendida. */
function GameTile({ accent }: { accent: string }) {
  return (
    <span aria-hidden className="grid size-14 shrink-0 grid-cols-3 gap-0.5 rounded-2xl bg-surface p-1.5">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="rounded-[4px]" style={{ background: i === 4 || i === 0 || i === 8 ? accent : "var(--cell)" }} />
      ))}
    </span>
  );
}
