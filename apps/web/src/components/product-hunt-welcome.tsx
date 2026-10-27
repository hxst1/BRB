"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import { ACHIEVEMENT_EVENT } from "@/components/achievements/achievement-toaster";
import { achievementById, achievementVisible } from "@/lib/achievements";
import { signupHref } from "@/lib/signup";
import { isGamePage } from "@/lib/seo";
import { useMessages, usePagePath } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Llegó desde Product Hunt y aún no lo ha reclamado (con o sin cuenta todavía). */
const ARRIVED_KEY = "ph:arrived";
const DISMISSED_KEY = "ph:dismissed";

/** ¿Viene de Product Hunt? Su enlace a la web lleva ?ref=producthunt; si no, por de dónde viene. */
function fromProductHunt(): boolean {
  const params = new URLSearchParams(location.search);
  const tag = (params.get("ref") || params.get("utm_source") || "").toLowerCase();
  if (tag === "producthunt") return true;
  try {
    const host = new URL(document.referrer).hostname;
    return host === "producthunt.com" || host.endsWith(".producthunt.com");
  } catch {
    return false;
  }
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento (modo privado…): se pierde el aviso, nada más.
  }
};

/**
 * Premio del lanzamiento en Product Hunt: quien llega desde allí durante la
 * semana del lanzamiento se lleva el gorro (logro "product-hunt"). Con
 * cuenta, se reclama al momento y sale el aviso de logro; sin ella, se
 * recuerda en el navegador y se invita a crear la cuenta, y se reclama al
 * entrar. Ver claim_launch_reward.
 */
export function ProductHuntWelcome({ signedIn }: { signedIn: boolean }) {
  const m = useMessages();
  const pathname = usePagePath();
  const [invite, setInvite] = useState(false);

  useEffect(() => {
    const achievement = achievementById("product-hunt");
    if (!achievement || !achievementVisible(achievement, false)) return;
    if (fromProductHunt()) write(ARRIVED_KEY, "1");
    if (read(ARRIVED_KEY) !== "1") return;

    if (!signedIn) {
      // Se enseña después de montar: en el servidor no se sabe de dónde viene.
      if (read(DISMISSED_KEY) !== "1") queueMicrotask(() => setInvite(true));
      return;
    }
    // Con cuenta: se reclama y lo enseña AchievementToaster.
    void createClient()
      .rpc("claim_launch_reward", { source: "producthunt" })
      .then(({ data, error }) => {
        if (error) return;
        write(ARRIVED_KEY, null);
        if (data) window.dispatchEvent(new CustomEvent(ACHIEVEMENT_EVENT, { detail: "product-hunt" }));
      });
  }, [signedIn]);

  // En los juegos taparía los controles: sale en el resto de páginas.
  if (!invite || pathname.startsWith("/entrar") || isGamePage(pathname)) return null;

  function close() {
    write(DISMISSED_KEY, "1");
    setInvite(false);
  }

  return (
    <aside
      aria-labelledby="ph-welcome-title"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 mx-auto flex max-w-sm items-center gap-3 rounded-3xl bg-surface p-3 pr-4 shadow-lift sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0"
    >
      <span className="grid size-16 shrink-0 place-items-center rounded-2xl" style={{ background: "color-mix(in srgb, #ff6154 22%, var(--cell))" }}>
        <Avatar seed={7} parts={{ top: "launch", palette: "teal" }} size={56} mood="happy" />
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span id="ph-welcome-title" className="font-semibold">
          {m.productHunt.title}
        </span>
        <span className="text-xs text-muted">{m.productHunt.body}</span>
        <span className="flex items-center gap-3">
          <Link href={signupHref(pathname)} className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-bg">
            {m.common.signUpFree}
          </Link>
          <button type="button" onClick={close} className="text-xs text-muted hover:text-ink">
            {m.productHunt.later}
          </button>
        </span>
      </span>
    </aside>
  );
}
