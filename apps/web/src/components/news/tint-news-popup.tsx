"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InlinePicto } from "@/components/picto";
import { setTint } from "@/components/pwa/tint-picker";
import { achievementById } from "@/lib/achievements";
import { useLocale, useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { TINTS } from "@/lib/theme";

/** Id en seen_announcements. */
const ID = "tint-achievements";
/** Cuándo salieron los colores por logros: las cuentas posteriores los descubren con los primeros pasos. */
const LAUNCH = Date.parse("2026-10-23T16:30:00+02:00");
/** Pasado este tiempo ya no es novedad. */
const WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
/** Después del aviso de juegos nuevos (1,2 s): si ese sale, este espera a otra visita. */
const DELAY_MS = 2500;

const ACHIEVEMENT_TINTS = TINTS.filter((tint) => tint.achievement);

/**
 * Aviso, una sola vez por cuenta, de que los logros también dan colores para
 * la app. Los que ya tiene se pueden poner desde aquí mismo.
 */
export function TintNewsPopup({ viewerId }: { viewerId: string }) {
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [using, setUsing] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const locale = useLocale();
  const m = useMessages();
  const t = m.news.tints;

  useEffect(() => {
    if (Date.now() > LAUNCH + WINDOW_MS) return;
    let cancelled = false;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const [{ data: seen }, { data: profile }, { data: achievements }] = await Promise.all([
        supabase.from("seen_announcements").select("announcement").eq("announcement", ID),
        supabase.from("profiles").select("created_at").eq("id", viewerId).maybeSingle(),
        supabase.from("user_achievements").select("achievement"),
      ]);
      if (cancelled || !profile || (seen ?? []).length > 0 || Date.parse(profile.created_at) > LAUNCH) return;
      // Si hay otro aviso abierto (juegos nuevos, instalar la app…), se espera a otra visita.
      if (document.querySelector("[role=dialog][aria-modal=true]")) return;
      setUnlocked((achievements ?? []).map((row) => row.achievement));
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [viewerId]);

  useEffect(() => {
    if (!unlocked) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked]);

  function dismiss() {
    setUnlocked(null);
    void createClient()
      .rpc("mark_announcements_seen", { ids: [ID] })
      .then(() => undefined);
  }

  if (!unlocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={dismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tint-news-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
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

        <div className="pr-8">
          <p className="text-sm text-muted">{t.kicker}</p>
          <h2 id="tint-news-title" className="display text-3xl leading-tight font-bold">
            {t.title}
          </h2>
          <p className="mt-2 text-muted">{t.body}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {ACHIEVEMENT_TINTS.map((tint) => {
            const achievement = achievementById(tint.achievement!, locale);
            const mine = unlocked.includes(tint.achievement!);
            return (
              <li key={tint.value} className="flex items-center gap-3 rounded-3xl p-3" style={{ background: "var(--cell)" }}>
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-2xl"
                  style={{ background: `color-mix(in oklab, var(--surface) 30%, ${tint.color})` }}
                >
                  {!mine && <InlinePicto name="lock" className="!size-6" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{m.settings.tints[tint.value]}</span>
                  <span className="text-xs text-muted">
                    {mine ? t.yours(achievement?.name ?? "") : `${achievement?.name}: ${achievement?.description}`}
                  </span>
                </span>
                {mine && (
                  <button
                    type="button"
                    onClick={() => {
                      setTint(tint.value);
                      setUsing(tint.value);
                    }}
                    className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg"
                  >
                    {using === tint.value ? t.inUse : t.use}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <Link href="/perfil?seccion=logros" onClick={dismiss} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
            {t.seeAchievements}
          </Link>
          <button type="button" onClick={dismiss} className="text-sm text-muted hover:text-ink">
            {m.common.later}
          </button>
        </div>
      </div>
    </div>
  );
}
