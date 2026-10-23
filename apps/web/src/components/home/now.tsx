"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { GameIcon, type IconName } from "@/components/game-icon";
import { usePushNotifications } from "@/components/pwa/push";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/client";

type Person = { id: string; username: string; avatar_seed: number; avatar_parts: Json };

/** Algo que te toca hacer ahora. */
export type NowItem = {
  key: string;
  kind: "turn" | "invite" | "challenge" | "friend";
  /** Id de la partida, del reto al 2048 o de la solicitud de amistad. */
  id: string;
  href: string;
  person: Person;
  /** Icono del juego (o de la solicitud de amistad). */
  icon: IconName;
  title: string;
  /** "hace 2 días", "caduca en 5 h"… (ya calculado en el servidor). */
  detail: string;
};

/** Un reto que has enviado y aún no han aceptado. */
export type WaitingItem = { key: string; href: string; person: Person; icon: IconName; title: string; detail: string };

export function NowSection({ items, waiting }: { items: NowItem[]; waiting: WaitingItem[] }) {
  const m = useMessages();
  return (
    <section aria-labelledby="now-title" className="flex flex-col gap-4">
      <h2 id="now-title" className="text-xl font-semibold">
        {m.now.title}
      </h2>

      <PushPrompt />

      {items.length === 0 ? (
        <p className="text-muted">{m.now.empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key}>
              <NowCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {waiting.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm text-muted">{m.now.waiting}</h3>
          <ul className="flex flex-col">
            {waiting.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-center gap-3 border-b border-line py-2 hover:bg-surface/60">
                  <Avatar seed={item.person.avatar_seed} parts={item.person.avatar_parts} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <GameIcon name={item.icon} className="mr-1.5 inline size-4 align-[-3px]" />
                    {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function NowCard({ item }: { item: NowItem }) {
  const router = useRouter();
  const m = useMessages();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function respond(accept: boolean) {
    setBusy(true);
    setError(false);
    const supabase = createClient();
    const { error: rpcError } =
      item.kind === "invite"
        ? await supabase.rpc("respond_match", { match_id: item.id, accept })
        : item.kind === "friend"
          ? await supabase.rpc("respond_friend_request", { request_id: item.id, accept })
          : await supabase.rpc("decline_challenge", { challenge_id: item.id });
    if (rpcError) {
      setBusy(false);
      setError(true);
      return;
    }
    // Aceptar un reto lleva a la partida; lo demás se queda en el panel, ya actualizado.
    if (accept && item.kind === "invite") router.push(item.href);
    else router.refresh();
  }

  const urgent = item.kind === "turn";
  return (
    <div className={`flex h-full flex-col gap-3 rounded-3xl bg-surface p-4 shadow-soft ${urgent ? "ring-2 ring-[var(--mark-o)]" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="relative flex shrink-0">
          <Avatar seed={item.person.avatar_seed} parts={item.person.avatar_parts} size={44} />
          <span
            aria-hidden
            className="absolute -right-1.5 -bottom-1 grid size-6 place-items-center rounded-lg"
            style={{ background: "var(--board)" }}
          >
            <GameIcon name={item.icon} className="size-4" />
          </span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold text-balance">{item.title}</span>
          <span className="text-xs text-muted">{item.detail}</span>
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {item.kind === "turn" && (
          <Link href={item.href} className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg">
            {m.common.play}
          </Link>
        )}
        {(item.kind === "invite" || item.kind === "friend") && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond(true)}
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {m.now.accept}
            </button>
            <button type="button" disabled={busy} onClick={() => void respond(false)} className="px-2 text-sm text-muted hover:text-ink disabled:opacity-50">
              {m.now.decline}
            </button>
          </>
        )}
        {item.kind === "challenge" && (
          <>
            <Link href={item.href} className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg">
              {m.common.play}
            </Link>
            <button type="button" disabled={busy} onClick={() => void respond(false)} className="px-2 text-sm text-muted hover:text-ink disabled:opacity-50">
              {m.now.decline}
            </button>
          </>
        )}
        {error && <span className="text-xs text-danger">{m.common.error}</span>}
      </div>
    </div>
  );
}

/** Invita a activar los avisos (sin ellos, los retos pasan desapercibidos). */
function PushPrompt() {
  const { push, busy, error, enable } = usePushNotifications();
  const m = useMessages();
  if (push !== "off" && push !== "ios-install") return null;

  return (
    <div className="flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--board)" }}>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">{m.now.pushTitle}</p>
        <p className="text-sm text-muted">
          {push === "ios-install" ? m.now.pushIos : m.now.pushHint}
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      {push === "off" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void enable()}
          className="shrink-0 self-start rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50 sm:self-center"
        >
          {m.now.pushEnable}
        </button>
      )}
    </div>
  );
}
