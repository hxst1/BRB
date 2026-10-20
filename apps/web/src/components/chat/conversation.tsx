"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Match, Tables } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import type { Challenge } from "@/components/game2048/challenge-text";
import { ChallengeMenu } from "@/components/challenge-menu";
import type { Friend } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { ChallengeEmbed } from "./embed";

type Message = Tables<"messages">;
/** Mensaje propio aún sin confirmar por el servidor (o que ha fallado). */
type Outgoing = { id: string; body: string; created_at: string; failed?: boolean };

const PAGE = 50;
const BUBBLE = "max-w-[80%] rounded-2xl px-3.5 py-2 text-left whitespace-pre-wrap [overflow-wrap:anywhere]";

const SEND_ERRORS: Record<string, string> = {
  rate_limited: "Vas muy rápido. Espera un momento.",
  not_friends: "Ya no sois amigos, así que no puedes escribirle.",
  too_long: "El mensaje es demasiado largo (máximo 1.000 caracteres).",
};

function pairFilter(viewerId: string, friendId: string): string {
  return `and(sender_id.eq.${viewerId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${viewerId})`;
}

export function Conversation({ viewerId, friend, onActivity }: { viewerId: string; friend: Friend; onActivity: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [challenges, setChallenges] = useState<Record<string, Challenge>>({});
  const [refsVersion, setRefsVersion] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const markRead = useCallback(async () => {
    const { error: readError } = await createClient().rpc("mark_conversation_read", { friend: friend.id });
    if (!readError) {
      onActivity();
      // La cabecera cuenta los no leídos en el servidor.
      router.refresh();
    }
  }, [friend.id, onActivity, router]);

  // Carga inicial y mensajes nuevos por Realtime.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("messages")
      .select("*")
      .or(pairFilter(viewerId, friend.id))
      .order("created_at", { ascending: false })
      .limit(PAGE)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((data ?? []).reverse());
        setHasMore((data?.length ?? 0) === PAGE);
        if (data?.some((m) => m.sender_id === friend.id && !m.read_at)) void markRead();
      });

    const channel = supabase
      .channel(`chat:${viewerId}:${friend.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as Message;
        const inPair =
          (message.sender_id === friend.id && message.recipient_id === viewerId) ||
          (message.sender_id === viewerId && message.recipient_id === friend.id);
        if (!inPair) return;
        setMessages((current) => (current && !current.some((m) => m.id === message.id) ? [...current, message] : current));
        if (message.sender_id === friend.id && document.visibilityState === "visible") void markRead();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [viewerId, friend.id, markRead]);

  // Estado de los retos que aparecen como tarjetas: se recarga al cambiar alguno
  // (Realtime) o al volver a la pestaña, porque el resultado de un reto de 2048
  // depende de una partida que no emite eventos.
  const matchIds = (messages ?? []).filter((m) => m.kind === "match").map((m) => m.ref_id!).sort().join(",");
  const hasChallenges = (messages ?? []).some((m) => m.kind === "challenge");

  useEffect(() => {
    if (!matchIds && !hasChallenges) return;
    let cancelled = false;
    const supabase = createClient();
    void Promise.all([
      matchIds ? supabase.from("matches").select("*").in("id", matchIds.split(",")) : Promise.resolve({ data: [] }),
      hasChallenges ? supabase.rpc("get_my_challenges", { max_rows: 100 }) : Promise.resolve({ data: [] }),
    ]).then(([matchRows, challengeRows]) => {
      if (cancelled) return;
      setMatches(Object.fromEntries((matchRows.data ?? []).map((m: Match) => [m.id, m])));
      setChallenges(Object.fromEntries((challengeRows.data ?? []).map((c: Challenge) => [c.id, c])));
    });
    return () => {
      cancelled = true;
    };
  }, [matchIds, hasChallenges, refsVersion]);

  useEffect(() => {
    if (!matchIds && !hasChallenges) return;
    const supabase = createClient();
    const bump = () => setRefsVersion((n) => n + 1);
    const channel = supabase
      .channel(`chat-refs:${viewerId}:${friend.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, bump)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "challenges" }, bump)
      .subscribe();
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("focus", bump);
      void supabase.removeChannel(channel);
    };
  }, [viewerId, friend.id, matchIds, hasChallenges]);

  // Mantener la vista abajo al llegar mensajes, salvo si el usuario ha subido a leer.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, outgoing]);

  async function loadOlder() {
    const oldest = messages?.[0];
    if (!oldest) return;
    const element = scroller.current;
    const previousHeight = element?.scrollHeight ?? 0;
    const { data } = await createClient()
      .from("messages")
      .select("*")
      .or(pairFilter(viewerId, friend.id))
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    stickToBottom.current = false;
    setMessages((current) => [...(data ?? []).reverse(), ...(current ?? [])]);
    setHasMore((data?.length ?? 0) === PAGE);
    // Conservar la posición de lectura al añadir mensajes por arriba.
    requestAnimationFrame(() => {
      if (element) element.scrollTop = element.scrollHeight - previousHeight;
    });
  }

  async function send(body: string, retryId?: string) {
    const text = body.trim();
    if (!text) return;
    setError(null);
    stickToBottom.current = true;
    const id = retryId ?? `local-${crypto.randomUUID()}`;
    setOutgoing((current) => [
      ...current.filter((m) => m.id !== id),
      { id, body: text, created_at: new Date().toISOString() },
    ]);

    const { data, error: sendError } = await createClient().rpc("send_message", { recipient: friend.id, body: text });
    if (sendError || !data) {
      setOutgoing((current) => current.map((m) => (m.id === id ? { ...m, failed: true } : m)));
      setError(SEND_ERRORS[sendError?.hint ?? ""] ?? "No se ha podido enviar. Toca el mensaje para reintentarlo.");
      return;
    }
    setOutgoing((current) => current.filter((m) => m.id !== id));
    setMessages((current) => (current && !current.some((m) => m.id === data.id) ? [...current, data] : current));
    onActivity();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Mayús+Enter hace un salto de línea.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
      setDraft("");
    }
  }


  const items = [
    ...(messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      mine: m.sender_id === viewerId,
      failed: false,
      pending: false,
      kind: m.kind,
      ref_id: m.ref_id,
    })),
    ...outgoing.map((m) => ({
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      mine: true,
      failed: !!m.failed,
      pending: !m.failed,
      kind: "text",
      ref_id: null,
    })),
  ];

  return (
    <section aria-label={`Conversación con ${friend.username}`} className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link href="/chat" className="text-sm text-muted hover:text-ink lg:hidden">
          Chats
        </Link>
        <Avatar seed={friend.avatar_seed} parts={friend.avatar_parts} size={40} />
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{friend.username}</h2>
        <ChallengeMenu friendId={friend.id} />
      </header>

      <div
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto py-4"
        aria-live="polite"
      >
        {hasMore && (
          <button type="button" onClick={() => void loadOlder()} className="mb-2 self-center text-sm text-muted hover:text-ink">
            Cargar mensajes anteriores
          </button>
        )}
        {messages === null && <div className="m-auto h-6 w-32 animate-pulse rounded-full bg-line/60" />}
        {messages !== null && items.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-muted">
            Aún no os habéis escrito. Rompe el hielo, o directamente rétale a una partida.
          </p>
        )}
        {items.map((item, index) => {
          const day = dayLabel(item.created_at);
          const showDay = index === 0 || dayLabel(items[index - 1]!.created_at) !== day;
          return (
            <div key={item.id} className="flex flex-col">
              {showDay && <p className="my-2 self-center text-xs text-muted">{day}</p>}
              {(item.kind === "match" || item.kind === "challenge") && item.ref_id ? (
                <ChallengeEmbed
                  kind={item.kind}
                  mine={item.mine}
                  viewerId={viewerId}
                  friendName={friend.username}
                  match={matches[item.ref_id]}
                  challenge={challenges[item.ref_id]}
                  onChanged={() => setRefsVersion((n) => n + 1)}
                />
              ) : item.failed ? (
                <button
                  type="button"
                  onClick={() => void send(item.body, item.id)}
                  className={`${BUBBLE} self-end rounded-br-md bg-ink text-bg opacity-60 ring-2 ring-danger`}
                >
                  {item.body}
                  <span className="sr-only"> (no enviado, pulsa para reintentarlo)</span>
                </button>
              ) : (
                <p
                  title={formatTime(item.created_at)}
                  className={`${BUBBLE} ${
                    item.mine
                      ? `self-end rounded-br-md bg-ink text-bg ${item.pending ? "opacity-60" : ""}`
                      : "self-start rounded-bl-md bg-surface shadow-soft"
                  }`}
                >
                  {item.body}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="pb-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line pt-3">
        <label htmlFor="message" className="sr-only">
          Mensaje para {friend.username}
        </label>
        <textarea
          id="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={1000}
          placeholder={`Escribe a ${friend.username}…`}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 outline-none [field-sizing:content] focus:border-focus"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="h-11 rounded-2xl bg-ink px-4 font-semibold text-bg disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es", { day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}
