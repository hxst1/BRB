"use client";

import { useEffect, useRef, useState } from "react";
import type { GameId } from "@/components/home/game-cards";
import { GAME_FINISHED_EVENT } from "@/lib/game-rating";
import { useMessages, useLocale } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Partidas terminadas de un juego tras las que se pregunta. */
const FIRST_ASK = 3;
/** Si dice "Ahora no", se vuelve a preguntar tantas partidas después; al segundo "Ahora no", nunca más. */
const ASK_AGAIN_AFTER = 5;
const MAX_DISMISSALS = 2;
/** Tras la partida, un momento para que se vea cómo ha acabado. */
const DELAY_MS = 1500;
/** Juegos en pruebas: la pregunta lo dice. */
const BETA: readonly string[] = ["orbits"];
/** Partidas de Órbitas: no pasan por el servidor, se cuentan en el dispositivo. */
export const ORBITS_GAMES_KEY = "orbits:games";

const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

/** Partidas en game_runs de cada juego del catálogo (los de dificultades, todas juntas). */
const RUN_GAMES: Record<string, string[]> = {
  "2048": ["2048"],
  snake: ["snake"],
  "lights-out": ["lightsout"],
  minesweeper: ["minesweeper-easy", "minesweeper-medium", "minesweeper-hard"],
  sudoku: ["sudoku-easy", "sudoku-medium", "sudoku-hard"],
  solitaire: ["solitaire"],
  queens: ["queens-easy", "queens-medium", "queens-hard"],
  pairs: ["pairs"],
};
/** Juegos contra amigos cuyo id en matches no es el del catálogo. */
const MATCH_GAMES: Record<string, string[]> = { rps: ["rps", "rpsls"] };

type Answer = 1 | 2 | 3;
const ANSWERS: { value: Answer; key: "love" | "ok" | "meh" }[] = [
  { value: 3, key: "love" },
  { value: 2, key: "ok" },
  { value: 1, key: "meh" },
];

type Ask = { game: GameId; played: number };

async function gamesPlayed(supabase: ReturnType<typeof createClient>, viewerId: string, game: string): Promise<number> {
  if (game === "orbits") {
    try {
      return Number(localStorage.getItem(ORBITS_GAMES_KEY)) || 0;
    } catch {
      return 0;
    }
  }
  if (game === "wordle") {
    const { count } = await supabase.from("wordle_games").select("day", { count: "exact", head: true }).eq("user_id", viewerId).not("finished_at", "is", null);
    return count ?? 0;
  }
  const runs = RUN_GAMES[game];
  if (runs) {
    const { count } = await supabase.from("game_runs").select("id", { count: "exact", head: true }).eq("user_id", viewerId).eq("status", "finished").in("game", runs);
    return count ?? 0;
  }
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "finished")
    .in("game", MATCH_GAMES[game] ?? [game])
    .or(`player_x.eq.${viewerId},player_o.eq.${viewerId}`);
  return count ?? 0;
}

/**
 * Pregunta qué le parece un juego, como la encuesta de Órbitas: a la 3.ª
 * partida terminada; si dice "Ahora no", otra vez 5 partidas después, y al
 * segundo "Ahora no", nunca más. Una vez respondido, no se vuelve a preguntar.
 * Va a game_ratings, que se lee en el panel de admin.
 */
export function GameRatingPrompt({ viewerId }: { viewerId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const t = m.gameRating;
  const [ask, setAsk] = useState<Ask | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const closeButton = useRef<HTMLButtonElement>(null);
  /** Solo una pregunta por visita, aunque se terminen varias partidas. */
  const asked = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFinished = (event: Event) => {
      const game = (event as CustomEvent<string>).detail;
      if (asked.current || !game) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const supabase = createClient();
        const [{ data: row }, played, { data: seen }] = await Promise.all([
          supabase.from("game_ratings").select("rating, dismissals, games_played").eq("user_id", viewerId).eq("game", game).maybeSingle(),
          gamesPlayed(supabase, viewerId, game),
          // Quien ya contestó la encuesta de Órbitas en pruebas no la vuelve a ver.
          game === "orbits"
            ? supabase.from("seen_announcements").select("announcement").eq("announcement", "orbits-feedback").limit(1)
            : Promise.resolve({ data: [] }),
        ]);
        if (row?.rating != null || (seen ?? []).length > 0) return;
        const dismissals = row?.dismissals ?? 0;
        if (dismissals >= MAX_DISMISSALS) return;
        const due = dismissals === 0 ? played >= FIRST_ASK : played >= (row?.games_played ?? 0) + ASK_AGAIN_AFTER;
        if (!due || asked.current || document.querySelector("[role=dialog][aria-modal=true]")) return;
        asked.current = true;
        setAnswer(null);
        setBody("");
        setState("idle");
        setAsk({ game: game as GameId, played });
      }, DELAY_MS);
    };
    window.addEventListener(GAME_FINISHED_EVENT, onFinished);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(GAME_FINISHED_EVENT, onFinished);
    };
  }, [viewerId]);

  const open = ask !== null;
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function dismiss() {
    if (!ask) return;
    // Cerrar sin contestar cuenta como "Ahora no"; tras enviar, solo se cierra.
    if (state !== "sent") {
      void createClient()
        .rpc("dismiss_game_rating", { game: ask.game, games_played: ask.played })
        .then(() => undefined);
    }
    setAsk(null);
  }

  async function send() {
    if (!ask || !answer) return;
    setState("sending");
    const { error } = await createClient().rpc("rate_game", {
      game: ask.game,
      rating: answer,
      comment: body.trim() || undefined,
      games_played: ask.played,
      locale,
      app_version: APP_VERSION,
    });
    setState(error ? "idle" : "sent");
  }

  if (!ask) return null;
  const name = m.gameCards[ask.game]?.title ?? ask.game;
  const beta = BETA.includes(ask.game);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={dismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-rating-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex w-full max-w-md flex-col gap-4 rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={dismiss}
          aria-label={m.common.close}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {state === "sent" ? (
          <>
            <div className="pr-8">
              <h2 id="game-rating-title" className="display text-3xl leading-tight font-bold">
                {t.thanks}
              </h2>
              <p className="mt-2 text-muted">{t.thanksBody}</p>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={dismiss} className="text-sm font-medium text-muted hover:text-ink">
                {m.common.close}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="pr-8">
              <p className="text-sm text-muted">{beta ? t.betaKicker : t.kicker}</p>
              <h2 id="game-rating-title" className="display text-3xl leading-tight font-bold">
                {t.title(name)}
              </h2>
              <p className="mt-2 text-muted">{beta ? t.betaBody : t.body}</p>
            </div>
            <div role="radiogroup" aria-labelledby="game-rating-title" className="grid grid-cols-3 gap-2">
              {ANSWERS.map(({ value, key }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={answer === value}
                  onClick={() => setAnswer(value)}
                  className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition-colors ${
                    answer === value ? "border-ink bg-ink text-bg" : "border-line bg-bg hover:border-muted"
                  }`}
                >
                  {t.answers[key]}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={1500}
              placeholder={t.placeholder}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-base outline-none focus:border-focus"
            />
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={dismiss} className="text-sm font-medium text-muted hover:text-ink">
                {t.later}
              </button>
              <button
                type="button"
                disabled={!answer || state === "sending"}
                onClick={() => void send()}
                className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg disabled:opacity-40"
              >
                {state === "sending" ? m.feedback.sending : t.send}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
