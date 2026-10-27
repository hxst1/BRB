"use client";

import Link from "next/link";
import type { Functions } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { useLocale, useMessages } from "@/lib/i18n/client";
import { stickerFromEmoji } from "@/lib/stickers";
import { ConversationListSkeleton } from "./chat-skeleton";

export type ConversationSummary = Functions<"get_conversations">["Returns"][number];

export function ConversationList({ items, activeId }: { items: ConversationSummary[] | null; activeId: string | null }) {
  const m = useMessages();
  const locale = useLocale();
  if (items === null) {
    return <ConversationListSkeleton />;
  }
  // Un sticker se guarda como su emoji; en la lista se nombra en vez de enseñar el emoji.
  const preview = (body: string) => {
    const sticker = stickerFromEmoji(body);
    return sticker ? `Sticker: ${m.stickers[sticker.id]}` : body;
  };
  if (items.length === 0) {
    return (
      <p className="reveal-in text-sm text-muted">
        {m.chat.needFriends}{" "}
        <Link href="/amigos" className="font-medium text-ink underline underline-offset-4">
          {m.matchList.addSomeone}
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="reveal-in flex flex-col">
      {items.map((item) => {
        const active = item.friend_id === activeId;
        const unread = item.unread > 0;
        return (
          // Una línea entre chats (salvo en el abierto, que ya se distingue por su fondo).
          <li key={item.friend_id} className="border-b border-line last:border-b-0">
            <Link
              href={`/chat/${item.friend_id}`}
              aria-current={active ? "page" : undefined}
              className={`-mx-2 my-1 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors ${
                active ? "bg-surface shadow-soft" : "hover:bg-surface/60"
              }`}
            >
              <Avatar seed={item.avatar_seed} parts={item.avatar_parts} size={48} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{item.username}</span>
                  {item.last_body && (
                    <span className={`shrink-0 text-xs ${unread ? "font-semibold" : "text-muted"}`} style={unread ? { color: "var(--mark-x)" } : undefined}>
                      {lastAt(item.last_at, locale, m.chat.yesterday)}
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${unread ? "font-medium text-ink" : "text-muted"}`}>
                    {item.last_body ? `${item.last_from_me ? m.chat.youPrefix : ""}${preview(item.last_body)}` : m.chat.noMessages}
                  </span>
                  {unread && (
                    <span
                      className="tabular grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[11px] font-bold text-white"
                      style={{ background: "var(--mark-x)" }}
                      aria-label={m.chat.unread(item.unread)}
                    >
                      {item.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Hora si es de hoy, "ayer", o la fecha corta, como en las apps de mensajes. */
function lastAt(iso: string, locale: string, yesterdayLabel: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}
