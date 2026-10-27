"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { Json, Match, Tables } from "@repo/db";
import type { Sticker } from "@repo/avatars";
import { Avatar } from "@repo/ui/avatar";
import type { Challenge } from "@/components/game2048/challenge-text";
import { ChallengeMenu } from "@/components/challenge-menu";
import type { Friend } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { STICKER_LIST, stickerFromEmoji } from "@/lib/stickers";
import { ChallengeEmbed } from "./embed";
import { StickerImage } from "./sticker";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import { useLocale, useMessages } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n";
import { playSound } from "@/lib/sound";

type Message = Tables<"messages">;
/** Mensaje propio aún sin confirmar por el servidor (o que ha fallado). */
type Outgoing = { id: string; body: string; created_at: string; failed?: boolean };

const PAGE = 50;
/** Dos toques más seguidos que esto son un "me gusta". */
const DOUBLE_TAP_MS = 320;
const BUBBLE = "max-w-[80%] rounded-2xl px-3.5 py-2 text-left whitespace-pre-wrap [overflow-wrap:anywhere]";

/** Errores de envío que tienen texto propio (m.chat.sendErrors). */
function sendErrorText(m: Messages, hint: string | undefined): string | undefined {
  return hint === "rate_limited" || hint === "not_friends" || hint === "too_long" ? m.chat.sendErrors[hint] : undefined;
}

function pairFilter(viewerId: string, friendId: string): string {
  return `and(sender_id.eq.${viewerId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${viewerId})`;
}

export function Conversation({
  viewerId,
  viewerAvatar,
  friend,
  onActivity,
}: {
  viewerId: string;
  viewerAvatar: { seed: number; parts: Json };
  friend: Friend;
  onActivity: () => void;
}) {
  const router = useRouter();
  const m = useMessages();
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [challenges, setChallenges] = useState<Record<string, Challenge>>({});
  const [refsVersion, setRefsVersion] = useState(0);
  const [stickersOpen, setStickersOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const mobile = useMobileFullscreen();

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

    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`chat:${viewerId}:${friend.id}`))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const message = payload.new as Message;
          const inPair =
            (message.sender_id === friend.id && message.recipient_id === viewerId) ||
            (message.sender_id === viewerId && message.recipient_id === friend.id);
          if (!inPair) return;
          setMessages((current) => (current && !current.some((m) => m.id === message.id) ? [...current, message] : current));
          if (message.sender_id === friend.id && document.visibilityState === "visible") void markRead();
        })
        // Me gusta (y leído): llegan como cambios del mensaje.
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
          const message = payload.new as Message;
          setMessages((current) => current?.map((m) => (m.id === message.id ? { ...m, liked_by: message.liked_by, read_at: message.read_at } : m)) ?? current);
        })
        .subscribe(),
    );

    return () => {
      cancelled = true;
      unsubscribe();
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
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`chat-refs:${viewerId}:${friend.id}`))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, bump)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "challenges" }, bump)
        .subscribe(),
    );
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("focus", bump);
      unsubscribe();
    };
  }, [viewerId, friend.id, matchIds, hasChallenges]);

  // Mantener la vista abajo al llegar mensajes, salvo si el usuario ha subido a leer.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, outgoing]);

  // Y también cuando algo cambia de tamaño después: las tarjetas de retos que
  // cargan sus datos, o el hueco visible al abrir o cerrar el teclado.
  useEffect(() => {
    const element = scroller.current;
    if (!element || !content.current) return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    observer.observe(content.current);
    return () => observer.disconnect();
  }, []);

  // Me gusta: dos toques (o doble clic) en un mensaje; el corazón de debajo lo quita o lo pone.
  const [burst, setBurst] = useState<string | null>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const lastPointer = useRef<string>("mouse");

  async function setLike(id: string, liked: boolean) {
    const apply = (likedBy: (current: string[]) => string[]) =>
      setMessages((current) => current?.map((m) => (m.id === id ? { ...m, liked_by: likedBy(m.liked_by) } : m)) ?? current);
    apply((current) => (liked ? [...new Set([...current, viewerId])] : current.filter((user) => user !== viewerId)));
    if (liked) {
      setBurst(id);
      playSound("pop");
      navigator.vibrate?.(12);
      setTimeout(() => setBurst((current) => (current === id ? null : current)), 700);
    }
    const { data, error: likeError } = await createClient().rpc("like_message", { message_id: id, liked });
    if (!likeError && data) apply(() => data);
  }

  function onBubblePointer(id: string, event: ReactPointerEvent) {
    lastPointer.current = event.pointerType;
    if (event.pointerType === "mouse") return;
    const now = event.timeStamp;
    const last = lastTap.current;
    if (last && last.id === id && now - last.at < DOUBLE_TAP_MS) {
      lastTap.current = null;
      void setLike(id, true);
    } else {
      lastTap.current = { id, at: now };
    }
  }

  function onBubbleDoubleClick(id: string) {
    // Con el dedo ya lo cuenta onBubblePointer (algunos navegadores también lanzan dblclick).
    if (lastPointer.current === "mouse") void setLike(id, true);
  }

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
      setError(sendErrorText(m, sendError?.hint) ?? m.chat.sendError);
      return;
    }
    setOutgoing((current) => current.filter((m) => m.id !== id));
    setMessages((current) => (current && !current.some((m) => m.id === data.id) ? [...current, data] : current));
    onActivity();
  }

  async function sendSticker(sticker: Sticker) {
    setStickersOpen(false);
    setError(null);
    stickToBottom.current = true;
    const { data, error: sendError } = await createClient().rpc("send_sticker", { recipient: friend.id, sticker });
    if (sendError || !data) {
      setError(sendErrorText(m, sendError?.hint) ?? m.chat.stickerError);
      return;
    }
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
      liked_by: m.liked_by,
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
      liked_by: [] as string[],
    })),
  ];

  return (
    <section
      aria-label={m.chat.with(friend.username)}
      // En el móvil, a pantalla completa y del alto de lo visible (sin el teclado), como una app de mensajes.
      style={mobile.style}
      className={
        mobile.active
          ? "fixed inset-x-0 top-0 z-30 flex flex-col bg-bg px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
          : "flex h-full min-h-0 flex-col"
      }
    >
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link
          href="/chat"
          aria-label={m.chat.back}
          className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
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
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4"
        aria-live="polite"
      >
        <div ref={content} className="flex min-h-full flex-col justify-end gap-1.5">
        {hasMore && (
          <button type="button" onClick={() => void loadOlder()} className="mb-2 self-center text-sm text-muted hover:text-ink">
            {m.chat.loadOlder}
          </button>
        )}
        {messages === null && <div className="m-auto h-6 w-32 animate-pulse rounded-full bg-line/60" />}
        {messages !== null && items.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-muted">
            {m.chat.empty}
          </p>
        )}
        {items.map((item, index) => {
          const day = dayLabel(item.created_at, locale, m);
          const showDay = index === 0 || dayLabel(items[index - 1]!.created_at, locale, m) !== day;
          return (
            <div key={item.id} className="flex flex-col">
              {showDay && <p className="my-2 self-center text-xs text-muted">{day}</p>}
              {item.kind === "sticker" && stickerFromEmoji(item.body) ? (
                <Likeable
                  mine={item.mine}
                  likedBy={item.liked_by}
                  viewerId={viewerId}
                  burst={burst === item.id}
                  onPointerUp={(event) => onBubblePointer(item.id, event)}
                  onDoubleClick={() => onBubbleDoubleClick(item.id)}
                  onToggle={(liked) => void setLike(item.id, liked)}
                  m={m}
                >
                  <span title={formatTime(item.created_at, locale)}>
                    <StickerImage
                      sticker={stickerFromEmoji(item.body)!.id}
                      seed={item.mine ? viewerAvatar.seed : friend.avatar_seed}
                      parts={item.mine ? viewerAvatar.parts : friend.avatar_parts}
                      label={`Sticker: ${m.stickers[stickerFromEmoji(item.body)!.id]}`}
                    />
                  </span>
                </Likeable>
              ) : (item.kind === "match" || item.kind === "challenge") && item.ref_id ? (
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
              ) : item.pending ? (
                <p title={formatTime(item.created_at, locale)} className={`${BUBBLE} self-end rounded-br-md bg-ink text-bg opacity-60`}>
                  {item.body}
                </p>
              ) : (
                <Likeable
                  mine={item.mine}
                  likedBy={item.liked_by}
                  viewerId={viewerId}
                  burst={burst === item.id}
                  onPointerUp={(event) => onBubblePointer(item.id, event)}
                  onDoubleClick={() => onBubbleDoubleClick(item.id)}
                  onToggle={(liked) => void setLike(item.id, liked)}
                  m={m}
                >
                  <p
                    title={formatTime(item.created_at, locale)}
                    className={`${BUBBLE} max-w-full ${item.mine ? "rounded-br-md bg-ink text-bg" : "rounded-bl-md bg-surface shadow-soft"}`}
                  >
                    {item.body}
                  </p>
                </Likeable>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {error && (
        <p role="alert" className="pb-2 text-sm text-danger">
          {error}
        </p>
      )}

      {stickersOpen && (
        <div role="group" aria-label="Stickers" className="grid grid-cols-6 gap-1 border-t border-line py-2">
          {STICKER_LIST.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => void sendSticker(sticker.id)}
              className="grid place-items-center rounded-2xl p-1 transition-transform hover:bg-surface active:scale-90"
              aria-label={m.chat.sendSticker(m.stickers[sticker.id])}
            >
              <StickerImage sticker={sticker.id} seed={viewerAvatar.seed} parts={viewerAvatar.parts} label="" size={52} />
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className={`flex items-end gap-2 border-t border-line pt-3 ${
          mobile.active ? (mobile.keyboard ? "pb-2" : "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]") : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setStickersOpen((open) => !open)}
          aria-expanded={stickersOpen}
          aria-label={stickersOpen ? m.chat.closeStickers : m.chat.stickers}
          className={`grid size-11 shrink-0 place-items-center rounded-2xl transition-colors ${stickersOpen ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink"}`}
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 14.5q3.5 3 7 0" />
            <circle cx="9" cy="10" r="0.6" fill="currentColor" />
            <circle cx="15" cy="10" r="0.6" fill="currentColor" />
          </svg>
        </button>
        <label htmlFor="message" className="sr-only">
          {m.chat.messageFor(friend.username)}
        </label>
        <textarea
          ref={textarea}
          id="message"
          enterKeyHint="send"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={1000}
          placeholder={m.chat.placeholder(friend.username)}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 outline-none [field-sizing:content] focus:border-focus"
        />
        <button
          type="submit"
          // Que pulsar Enviar no quite el foco: el teclado sigue abierto para seguir escribiendo.
          onPointerDown={(event) => event.preventDefault()}
          disabled={!draft.trim()}
          className="h-11 rounded-2xl bg-ink px-4 font-semibold text-bg disabled:opacity-40"
        >
          {m.feedback.send}
        </button>
      </form>
    </section>
  );
}

/**
 * Un mensaje al que se le puede dar me gusta: dos toques o doble clic encima,
 * y el corazón de la esquina (si alguien le ha dado) lo quita o lo pone.
 */
function Likeable({
  mine,
  likedBy,
  viewerId,
  burst,
  onPointerUp,
  onDoubleClick,
  onToggle,
  m,
  children,
}: {
  mine: boolean;
  likedBy: string[];
  viewerId: string;
  burst: boolean;
  onPointerUp: (event: ReactPointerEvent) => void;
  onDoubleClick: () => void;
  onToggle: (liked: boolean) => void;
  m: Messages;
  children: ReactNode;
}) {
  const likedByMe = likedBy.includes(viewerId);
  return (
    <div
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      // Que el doble clic no seleccione la palabra.
      onMouseDown={(event: ReactMouseEvent) => event.detail > 1 && event.preventDefault()}
      className={`relative flex max-w-[80%] touch-manipulation ${mine ? "self-end justify-end" : "self-start"} ${likedBy.length ? "mb-3" : ""}`}
    >
      {children}
      {burst && (
        <span aria-hidden className="chat-heart-burst pointer-events-none absolute inset-0 grid place-items-center">
          <HeartIcon className="size-12 drop-shadow" />
        </span>
      )}
      {likedBy.length > 0 && (
        <button
          type="button"
          onClick={() => onToggle(!likedByMe)}
          aria-pressed={likedByMe}
          aria-label={likedByMe ? m.chat.unlike : m.chat.like}
          className={`absolute -bottom-3 flex items-center gap-0.5 rounded-full border-2 border-bg bg-surface px-1.5 py-0.5 text-xs font-semibold shadow-soft ${
            mine ? "left-1" : "right-1"
          }`}
        >
          <HeartIcon className="size-3.5" />
          {likedBy.length > 1 && <span className="tabular">{likedBy.length}</span>}
        </button>
      )}
    </div>
  );
}

function HeartIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.2 0 5.4 3.1 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" fill="#ff6b6b" stroke="#15171c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function dayLabel(iso: string, locale: string, m: Messages): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return m.chat.today;
  if (date.toDateString() === yesterday.toDateString()) return m.chat.yesterdayTitle;
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * En el móvil (sin la columna de la lista), la conversación ocupa la parte
 * visible de la pantalla: al abrir el teclado, iOS no encoge la página sino
 * que la desplaza, así que se sigue a visualViewport. También bloquea el
 * scroll de la página de debajo y dice si el teclado está abierto.
 */
function useMobileFullscreen(): { active: boolean; keyboard: boolean; style?: CSSProperties } {
  const [state, setState] = useState<{ active: boolean; keyboard: boolean; height: number; top: number }>({
    active: false,
    keyboard: false,
    height: 0,
    top: 0,
  });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const viewport = window.visualViewport;
    const root = document.documentElement;

    const update = () => {
      if (!query.matches) {
        root.style.removeProperty("overflow");
        setState((current) => (current.active ? { active: false, keyboard: false, height: 0, top: 0 } : current));
        return;
      }
      root.style.overflow = "hidden";
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      // Si lo visible es bastante más bajo que la ventana, es el teclado.
      const keyboard = window.innerHeight - height > 120;
      setState({ active: true, keyboard, height, top });
    };

    update();
    query.addEventListener("change", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("overflow");
    };
  }, []);

  if (!state.active) return { active: false, keyboard: false };
  return { active: true, keyboard: state.keyboard, style: { height: state.height, transform: `translateY(${state.top}px)` } };
}
