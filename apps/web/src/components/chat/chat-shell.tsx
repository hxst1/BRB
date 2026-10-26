"use client";

import { useCallback, useEffect, useState } from "react";
import type { Json } from "@repo/db";
import { createClient } from "@/lib/supabase/client";
import { Conversation } from "./conversation";
import { ConversationList, type ConversationSummary } from "./conversation-list";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import { useMessages } from "@/lib/i18n/client";

/**
 * Lista de conversaciones + conversación abierta. En el móvil se ve una cosa
 * u otra según la ruta; en escritorio, las dos a la vez.
 */
export function ChatShell({
  viewerId,
  viewerAvatar,
  friendId,
}: {
  viewerId: string;
  /** Tu monstruo, para tus stickers. */
  viewerAvatar: { seed: number; parts: Json };
  friendId: string | null;
}) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  const reload = useCallback(async () => {
    const { data } = await createClient().rpc("get_conversations");
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.rpc("get_conversations").then(({ data }) => {
      if (!cancelled) setItems(data ?? []);
    });
    // Cualquier mensaje nuevo (enviado o recibido) reordena la lista.
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`chat-list:${viewerId}`))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
          supabase.rpc("get_conversations").then(({ data }) => {
            if (!cancelled) setItems(data ?? []);
          });
        })
        .subscribe(),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [viewerId]);

  const friend = items?.find((item) => item.friend_id === friendId) ?? null;

  const m = useMessages();
  return (
    <div className="grid grid-cols-1 h-[calc(100dvh-13.5rem-env(safe-area-inset-bottom))] min-h-80 gap-8 sm:h-[calc(100dvh-11rem)] lg:grid-cols-[18rem_minmax(0,1fr)]">
      {/* Hueco a los lados para el resaltado de cada chat (sus -mx-2), sin scroll horizontal. */}
      <div className={`-mx-2 min-h-0 overflow-x-hidden overflow-y-auto px-2 ${friendId ? "hidden lg:block" : ""}`}>
        <ConversationList items={items} activeId={friendId} />
      </div>
      <div className={`min-h-0 ${friendId ? "" : "hidden lg:block"}`}>
        {friendId === null ? (
          <p className="grid h-full place-items-center text-muted">{m.chat.pick}</p>
        ) : items === null ? null : friend ? (
          <Conversation
            key={friend.friend_id}
            viewerId={viewerId}
            viewerAvatar={viewerAvatar}
            friend={{ id: friend.friend_id, username: friend.username, avatar_seed: friend.avatar_seed, avatar_parts: friend.avatar_parts }}
            onActivity={() => void reload()}
          />
        ) : (
          <p className="grid h-full place-items-center text-center text-muted">
            {m.chat.onlyFriends}
          </p>
        )}
      </div>
    </div>
  );
}
