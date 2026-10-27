"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sanitizeParts } from "@repo/avatars";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { achievementById, wearing, type Achievement } from "@/lib/achievements";
import { useLocale, useMessages } from "@/lib/i18n/client";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import { InlinePicto } from "@/components/picto";
import { setTint } from "@/components/pwa/tint-picker";
import { rewardBackground } from "@/lib/theme";

/** Tiempo a la vista de cada aviso. */
const SHOW_MS = 9000;

/**
 * Evento del navegador para enseñar un logro que esta misma página acaba de
 * conseguir (detail: su id), por si llega antes de que el canal esté conectado.
 */
export const ACHIEVEMENT_EVENT = "achievement-unlocked";

/**
 * Aviso de "logro desbloqueado", en cualquier pantalla: llega en directo al
 * crearse el logro en la base de datos. Si llegan varios, van de uno en uno.
 */
export function AchievementToaster({ viewerId, avatarSeed, avatarParts }: { viewerId: string; avatarSeed: number; avatarParts: Json }) {
  const router = useRouter();
  const locale = useLocale();
  const m = useMessages();
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "worn" | "error">("idle");
  const current = queue[0];
  /** Los ya enseñados: el mismo logro puede llegar por el evento y por Realtime. */
  const shown = useRef(new Set<string>());

  useEffect(() => {
    const enqueue = (id: string) => {
      const achievement = achievementById(id, locale);
      if (!achievement || shown.current.has(id)) return;
      shown.current.add(id);
      setQueue((list) => [...list, achievement]);
    };
    const onEvent = (event: Event) => enqueue(String((event as CustomEvent<string>).detail));
    window.addEventListener(ACHIEVEMENT_EVENT, onEvent);
    const supabase = createClient();
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`achievements:${viewerId}`))
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_achievements", filter: `user_id=eq.${viewerId}` },
          (payload) => enqueue(String(payload.new.achievement)),
        )
        .subscribe(),
    );
    return () => {
      window.removeEventListener(ACHIEVEMENT_EVENT, onEvent);
      unsubscribe();
    };
  }, [viewerId, locale]);

  useEffect(() => {
    if (!current || state === "saving") return;
    const timer = setTimeout(next, SHOW_MS);
    return () => clearTimeout(timer);
  }, [current, state]);

  function next() {
    setQueue((list) => list.slice(1));
    setState("idle");
  }

  async function wear(achievement: Achievement) {
    // Un color de la app no se guarda en el perfil: es de este navegador.
    if (achievement.reward.slot === "tint") {
      setTint(achievement.reward.id);
      setState("worn");
      return;
    }
    setState("saving");
    const parts = wearing(sanitizeParts(avatarParts), achievement.reward);
    const { error } = await createClient().from("profiles").update({ avatar_parts: parts }).eq("id", viewerId);
    setState(error ? "error" : "worn");
    if (!error) router.refresh();
  }

  if (!current) return null;
  const preview = wearing(sanitizeParts(avatarParts), current.reward);
  const isTint = current.reward.slot === "tint";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <div
        role="status"
        className="install-sheet pointer-events-auto relative flex w-full max-w-sm items-center gap-3 rounded-3xl bg-surface p-3 pr-10 shadow-lift ring-2 ring-[var(--t256)]"
      >
        <span className="monster-cheer grid size-16 shrink-0 place-items-center rounded-2xl" style={{ background: rewardBackground(current.reward) }}>
          <Avatar seed={avatarSeed} parts={preview} size={52} mood="happy" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted">{m.achievements.unlocked}</span>
          <span className="font-semibold">
            <InlinePicto name={current.icon} className="mr-1.5" />
            {current.name}
          </span>
          <span className="text-xs">
            {isTint ? m.achievements.newTint : m.achievements.yourMonsterWears} <strong>{current.reward.label}</strong>
          </span>
          <span className="mt-1 flex items-center gap-3">
            {state === "worn" ? (
              <span className="text-sm font-medium">{isTint ? m.achievements.tintOn : m.achievements.worn}</span>
            ) : (
              <button
                type="button"
                disabled={state === "saving"}
                onClick={() => void wear(current)}
                className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {isTint ? m.achievements.useTint : m.achievements.wear}
              </button>
            )}
            <Link href="/perfil?seccion=logros" onClick={next} className="text-sm text-muted hover:text-ink">
              {m.achievements.see}
            </Link>
          </span>
          {state === "error" && <span className="text-xs text-danger">{m.achievements.wearError}</span>}
        </span>
        <button
          type="button"
          onClick={next}
          aria-label={m.common.close}
          className="absolute top-2 right-2 grid size-8 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
