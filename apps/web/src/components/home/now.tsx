"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { GameIcon, type IconName } from "@/components/game-icon";
import { usePushNotifications } from "@/components/pwa/push";
import { pictoSrc } from "@/lib/pictos";
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

/** Filas que se ven sin desplegar (dos filas de dos en escritorio). */
const LIMIT = 4;

/**
 * Lo pendiente, en filas cortas con su botón directo. Se actualiza solo
 * (LiveRefresh refresca la página cuando cambia algo), y lo que llega así
 * entra con un destello para que se note.
 */
export function NowSection({ items, waiting }: { items: NowItem[]; waiting: WaitingItem[] }) {
  const m = useMessages();
  const [expanded, setExpanded] = useState(false);
  const fresh = useFreshKeys(items.map((item) => item.key));
  const shown = expanded ? items : items.slice(0, LIMIT);

  return (
    <section aria-labelledby="now-title">
      <div className="flex items-center gap-2.5">
        <h2 id="now-title" className="text-xl font-semibold">
          {m.now.title}
        </h2>
        {items.length > 0 && (
          // key: al cambiar el número, el contador vuelve a montarse y da un pequeño salto.
          <span
            key={items.length}
            role="status"
            aria-label={m.now.pending(items.length)}
            className="now-pop grid h-6 min-w-6 place-items-center rounded-full bg-ink px-2 text-xs font-bold text-bg tabular"
          >
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-muted">{m.now.empty}</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {shown.map((item) => (
            <li key={item.key} className={fresh.has(item.key) ? "now-enter" : undefined}>
              <NowRow item={item} />
            </li>
          ))}
        </ul>
      )}

      {items.length > LIMIT && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
        >
          {expanded ? m.now.showLess : m.now.showMore(items.length - LIMIT)}
          <Chevron className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {waiting.length > 0 && <WaitingList items={waiting} />}

      <PushPrompt />
    </section>
  );
}

/**
 * Claves que no estaban en la lista anterior: lo que acaba de llegar en directo.
 * En la primera carga no hay ninguna (no tiene sentido destacar todo).
 */
function useFreshKeys(keys: string[]): ReadonlySet<string> {
  const id = keys.join(" ");
  const [state, setState] = useState({ id, keys, fresh: new Set<string>() as ReadonlySet<string> });
  if (state.id === id) return state.fresh;
  const fresh = new Set(keys.filter((key) => !state.keys.includes(key)));
  setState({ id, keys, fresh });
  return fresh;
}

function NowRow({ item }: { item: NowItem }) {
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

  const pill = "relative z-10 shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-bg disabled:opacity-50";
  return (
    <div
      className={`relative flex h-full items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft transition-opacity ${
        item.kind === "turn" ? "ring-2 ring-[var(--mark-o)]" : ""
      } ${busy ? "opacity-60" : ""}`}
    >
      <span className="relative flex shrink-0">
        <Avatar seed={item.person.avatar_seed} parts={item.person.avatar_parts} size={40} />
        <span aria-hidden className="absolute -right-1.5 -bottom-1 grid size-6 place-items-center rounded-lg bg-[var(--cell)] ring-2 ring-[var(--surface)]">
          <GameIcon name={item.icon} className="size-4" />
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        {/* El título enlaza y, con el ::after, toda la fila se puede tocar; los botones quedan por encima. */}
        <Link href={item.href} className="line-clamp-2 text-sm leading-snug font-semibold text-balance after:absolute after:inset-0 after:rounded-2xl">
          {item.title}
        </Link>
        {error ? <span className="text-xs text-danger">{m.common.error}</span> : <span className="truncate text-xs text-muted">{item.detail}</span>}
      </span>

      {(item.kind === "turn" || item.kind === "challenge") && (
        <Link href={item.href} tabIndex={-1} aria-hidden className={pill}>
          {m.common.play}
        </Link>
      )}
      {(item.kind === "invite" || item.kind === "friend") && (
        <button type="button" disabled={busy} onClick={() => void respond(true)} className={pill}>
          {m.now.accept}
        </button>
      )}
      {item.kind !== "turn" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void respond(false)}
          aria-label={`${m.now.decline}: ${item.title}`}
          title={m.now.decline}
          className="relative z-10 -ml-1 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Retos enviados sin respuesta: plegados tras sus caras, que no es nada urgente. */
function WaitingList({ items }: { items: WaitingItem[] }) {
  const m = useMessages();
  return (
    <details className="group mt-4">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl py-1.5 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="flex -space-x-2">
          {items.slice(0, 3).map((item) => (
            <span key={item.key} className="grid size-8 place-items-center rounded-full bg-surface ring-2 ring-[var(--bg)]">
              <Avatar seed={item.person.avatar_seed} parts={item.person.avatar_parts} size={24} />
            </span>
          ))}
        </span>
        <span className="flex-1">
          {m.now.waiting} <span className="tabular">({items.length})</span>
        </span>
        <Chevron className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-1 flex flex-col">
        {items.map((item) => (
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
    </details>
  );
}

/**
 * Invita a activar los avisos (sin ellos, los retos pasan desapercibidos).
 * Solo se sabe en el navegador: se despliega al final de la sección en vez
 * de aparecer de golpe arriba y empujarlo todo.
 */
function PushPrompt() {
  const { push, busy, error, enable } = usePushNotifications();
  const m = useMessages();
  const show = push === "off" || push === "ios-install";

  return (
    <div
      aria-hidden={!show}
      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className="min-h-0 overflow-hidden">
        {show && (
          <div className="pt-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl p-3" style={{ background: "var(--board)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pictoSrc("megaphone")} alt="" aria-hidden draggable={false} className="size-6" />
              </span>
              <span className="flex min-w-0 flex-1 basis-48 flex-col">
                <span className="text-sm font-semibold">{m.now.pushTitle}</span>
                <span className="text-xs text-muted">{push === "ios-install" ? m.now.pushIos : m.now.pushHint}</span>
                {error && <span className="text-xs text-danger">{error}</span>}
              </span>
              {push === "off" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void enable()}
                  className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
                >
                  {m.now.pushEnable}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
