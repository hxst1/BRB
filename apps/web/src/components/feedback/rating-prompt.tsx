"use client";

import { useEffect, useRef, useState } from "react";
import { brand } from "@repo/brand";
import { Stars } from "@/components/feedback/feedback-dialog";
import { useMessages, usePagePath } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Partidas terminadas tras las que se pregunta; si se dice "Ahora no", se vuelve a preguntar una vez, a las 15. */
const ASKS = [
  { games: 15, id: "rating-ask-15" },
  { games: 5, id: "rating-ask-5" },
] as const;
/** "No preguntar más". */
const NEVER = "rating-never";
/** Solo en pantallas que no son de juego: nunca a mitad de partida. */
const CALM_PAGES = ["/", "/ranking", "/perfil", "/amigos", "/chat"];
const DELAY_MS = 3000;

const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

type Step = { name: "ask" } | { name: "improve"; rating: number } | { name: "thanks"; rating: number };

/** Partidas terminadas: en solitario, contra amigos y el Wordle. */
async function gamesPlayed(supabase: ReturnType<typeof createClient>, viewerId: string): Promise<number> {
  const [runs, matches, wordle] = await Promise.all([
    supabase.from("game_runs").select("id", { count: "exact", head: true }).eq("status", "finished"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "finished").or(`player_x.eq.${viewerId},player_o.eq.${viewerId}`),
    supabase.from("wordle_games").select("day", { count: "exact", head: true }).not("finished_at", "is", null),
  ]);
  return (runs.count ?? 0) + (matches.count ?? 0) + (wordle.count ?? 0);
}

/**
 * Pide una valoración a quien ya ha jugado unas cuantas partidas (5, y otra
 * vez a las 15 si dijo "Ahora no"). Con 4 o 5 estrellas, invita a traer a
 * amigos; con menos, pregunta qué mejoraría. Va a feedback, como la
 * valoración de Ajustes.
 */
export function RatingPrompt({ viewerId }: { viewerId: string }) {
  const m = useMessages();
  const t = m.ratingPrompt;
  const path = usePagePath();
  const [ask, setAsk] = useState<{ id: string; games: number } | null>(null);
  const [step, setStep] = useState<Step>({ name: "ask" });
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const calm = CALM_PAGES.includes(path);

  useEffect(() => {
    if (!calm) return;
    let cancelled = false;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const [{ data: seen }, { data: rated }, games] = await Promise.all([
        supabase.from("seen_announcements").select("announcement").in("announcement", [NEVER, ...ASKS.map((a) => a.id)]),
        supabase.from("feedback").select("id").eq("kind", "rating").limit(1),
        gamesPlayed(supabase, viewerId),
      ]);
      if (cancelled || (rated ?? []).length > 0) return;
      const seenIds = new Set((seen ?? []).map((row) => row.announcement));
      if (seenIds.has(NEVER)) return;
      // La de 5 solo si no se ha preguntado ya; la de 15, la segunda vez.
      const due = ASKS.find((a) => games >= a.games && !seenIds.has(a.id) && (a.games === 5 || seenIds.has("rating-ask-5")));
      if (!due || document.querySelector("[role=dialog][aria-modal=true]")) return;
      setAsk({ id: due.id, games });
      const { data: friendCode } = await supabase.from("friend_codes").select("code").eq("user_id", viewerId).maybeSingle();
      if (!cancelled) setCode(friendCode?.code ?? null);
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [viewerId, calm]);

  useEffect(() => {
    if (ask) closeButton.current?.focus();
  }, [ask]);

  function close(ids: string[]) {
    setAsk(null);
    void createClient()
      .rpc("mark_announcements_seen", { ids })
      .then(() => undefined);
  }

  async function send(rating: number, comment?: string) {
    setSending(true);
    await createClient().rpc("submit_feedback", {
      kind: "rating",
      rating,
      body: comment?.trim() || undefined,
      path,
      user_agent: navigator.userAgent,
      app_version: APP_VERSION,
    });
    setSending(false);
    setStep({ name: "thanks", rating });
  }

  function choose(rating: number) {
    if (rating >= 4) void send(rating);
    else setStep({ name: "improve", rating });
  }

  async function invite() {
    if (!code) return;
    const url = `${window.location.origin}/invita/${code}`;
    const text = m.friends.shareText(brand.name);
    try {
      if (navigator.share) await navigator.share({ title: brand.name, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setInvited(true);
      }
    } catch {
      // Cancelado: no pasa nada.
    }
  }

  if (!ask) return null;
  // Ya valorado: no se vuelve a preguntar (y "No preguntar más" lo cierra para siempre).
  const done = () => close([ask.id, NEVER]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={() => (step.name === "ask" ? close([ask.id]) : done())}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-prompt-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex w-full max-w-md flex-col gap-4 rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={() => (step.name === "ask" ? close([ask.id]) : done())}
          aria-label={m.common.close}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {step.name === "ask" && (
          <>
            <div className="pr-8">
              <p className="text-sm text-muted">{t.kicker(ask.games)}</p>
              <h2 id="rating-prompt-title" className="display text-3xl leading-tight font-bold">
                {t.title(brand.name)}
              </h2>
            </div>
            <Stars value={0} onChange={choose} />
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => close([ask.id])} className="text-sm font-medium text-muted hover:text-ink">
                {t.later}
              </button>
              <button type="button" onClick={() => close([ask.id, NEVER])} className="text-sm text-muted hover:text-ink">
                {t.never}
              </button>
            </div>
          </>
        )}

        {step.name === "improve" && (
          <>
            <div className="pr-8">
              <h2 id="rating-prompt-title" className="display text-3xl leading-tight font-bold">
                {t.improveTitle}
              </h2>
              <p className="mt-2 text-muted">{t.improveBody}</p>
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t.improvePlaceholder}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-base outline-none focus:border-focus"
            />
            <div className="flex items-center justify-between gap-3">
              <button type="button" disabled={sending} onClick={() => void send(step.rating)} className="text-sm text-muted hover:text-ink">
                {t.skipComment}
              </button>
              <button
                type="button"
                disabled={sending || body.trim().length < 3}
                onClick={() => void send(step.rating, body)}
                className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg disabled:opacity-40"
              >
                {sending ? m.feedback.sending : m.feedback.send}
              </button>
            </div>
          </>
        )}

        {step.name === "thanks" && (
          <>
            <div className="pr-8">
              <h2 id="rating-prompt-title" className="display text-3xl leading-tight font-bold">
                {m.feedback.thanks}
              </h2>
              <p className="mt-2 text-muted">{step.rating >= 4 ? t.thanksHappy : t.thanksImprove}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              {step.rating >= 4 && code ? (
                <button type="button" onClick={() => void invite()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
                  {invited ? m.friends.inviteCopied : t.invite}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={done} className="text-sm font-medium text-muted hover:text-ink">
                {m.common.close}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
