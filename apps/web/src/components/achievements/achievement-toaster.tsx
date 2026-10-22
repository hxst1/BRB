"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sanitizeParts } from "@repo/avatars";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { achievementById, type Achievement } from "@/lib/achievements";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";

/** Tiempo a la vista de cada aviso. */
const SHOW_MS = 9000;

/**
 * Aviso de "logro desbloqueado", en cualquier pantalla: llega en directo al
 * crearse el logro en la base de datos. Si llegan varios, van de uno en uno.
 */
export function AchievementToaster({ viewerId, avatarSeed, avatarParts }: { viewerId: string; avatarSeed: number; avatarParts: Json }) {
  const router = useRouter();
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "worn" | "error">("idle");
  const current = queue[0];

  useEffect(() => {
    const supabase = createClient();
    return subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`achievements:${viewerId}`))
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_achievements", filter: `user_id=eq.${viewerId}` },
          (payload) => {
            const achievement = achievementById(String(payload.new.achievement));
            if (achievement) setQueue((list) => [...list, achievement]);
          },
        )
        .subscribe(),
    );
  }, [viewerId]);

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
    setState("saving");
    const parts = { ...sanitizeParts(avatarParts), [achievement.reward.slot]: achievement.reward.id };
    const { error } = await createClient().from("profiles").update({ avatar_parts: parts }).eq("id", viewerId);
    setState(error ? "error" : "worn");
    if (!error) router.refresh();
  }

  if (!current) return null;
  const preview = { ...sanitizeParts(avatarParts), [current.reward.slot]: current.reward.id };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <div
        role="status"
        className="install-sheet pointer-events-auto relative flex w-full max-w-sm items-center gap-3 rounded-3xl bg-surface p-3 pr-10 shadow-lift ring-2 ring-[var(--t256)]"
      >
        <span className="monster-cheer grid size-16 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--cell)" }}>
          <Avatar seed={avatarSeed} parts={preview} size={52} mood="happy" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted">Logro desbloqueado</span>
          <span className="font-semibold">
            <span aria-hidden className="mr-1.5">
              {current.icon}
            </span>
            {current.name}
          </span>
          <span className="text-xs">
            Tu bribón estrena: <strong>{current.reward.label}</strong>
          </span>
          <span className="mt-1 flex items-center gap-3">
            {state === "worn" ? (
              <span className="text-sm font-medium">¡Estrenado!</span>
            ) : (
              <button
                type="button"
                disabled={state === "saving"}
                onClick={() => void wear(current)}
                className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-bg disabled:opacity-50"
              >
                Estrenar
              </button>
            )}
            <Link href="/perfil?seccion=logros" onClick={next} className="text-sm text-muted hover:text-ink">
              Ver logros
            </Link>
          </span>
          {state === "error" && <span className="text-xs text-danger">No se ha podido. Pruébala desde tu perfil.</span>}
        </span>
        <button
          type="button"
          onClick={next}
          aria-label="Cerrar"
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
