"use client";

import Link from "next/link";
import type { Functions } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";

export type ConversationSummary = Functions<"get_conversations">["Returns"][number];

export function ConversationList({ items, activeId }: { items: ConversationSummary[] | null; activeId: string | null }) {
  if (items === null) {
    return <div className="h-40 animate-pulse rounded-3xl bg-line/40" />;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Para chatear necesitas amigos.{" "}
        <Link href="/amigos" className="font-medium text-ink underline underline-offset-4">
          Añade a alguien con su código
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const active = item.friend_id === activeId;
        return (
          <li key={item.friend_id}>
            <Link
              href={`/chat/${item.friend_id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl p-2.5 ${active ? "bg-surface shadow-soft" : "hover:bg-surface/60"}`}
            >
              <Avatar seed={item.avatar_seed} parts={item.avatar_parts} size={40} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate ${item.unread > 0 ? "font-bold" : "font-medium"}`}>{item.username}</span>
                <span className={`truncate text-sm ${item.unread > 0 ? "text-ink" : "text-muted"}`}>
                  {item.last_body ? `${item.last_from_me ? "Tú: " : ""}${item.last_body}` : "Sin mensajes todavía"}
                </span>
              </span>
              {item.unread > 0 && (
                <span
                  className="tabular grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white"
                  style={{ background: "var(--mark-x)" }}
                  aria-label={`${item.unread} sin leer`}
                >
                  {item.unread}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
