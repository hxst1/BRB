"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Conversation } from "./conversation";
import { ConversationList, type ConversationSummary } from "./conversation-list";

/**
 * Lista de conversaciones + conversación abierta. En el móvil se ve una cosa
 * u otra según la ruta; en escritorio, las dos a la vez.
 */
export function ChatShell({ viewerId, friendId }: { viewerId: string; friendId: string | null }) {
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
    const channel = supabase
      .channel(`chat-list:${viewerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        supabase.rpc("get_conversations").then(({ data }) => {
          if (!cancelled) setItems(data ?? []);
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [viewerId]);

  const friend = items?.find((item) => item.friend_id === friendId) ?? null;

  return (
    <div className="grid h-[calc(100dvh-13.5rem-env(safe-area-inset-bottom))] min-h-80 gap-8 sm:h-[calc(100dvh-11rem)] lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className={`min-h-0 overflow-y-auto ${friendId ? "hidden lg:block" : ""}`}>
        <ConversationList items={items} activeId={friendId} />
      </div>
      <div className={`min-h-0 ${friendId ? "" : "hidden lg:block"}`}>
        {friendId === null ? (
          <p className="grid h-full place-items-center text-muted">Elige una conversación.</p>
        ) : items === null ? null : friend ? (
          <Conversation
            key={friend.friend_id}
            viewerId={viewerId}
            friend={{ id: friend.friend_id, username: friend.username, avatar_seed: friend.avatar_seed, avatar_parts: friend.avatar_parts }}
            onActivity={() => void reload()}
          />
        ) : (
          <p className="grid h-full place-items-center text-center text-muted">
            Solo puedes chatear con tus amigos.
          </p>
        )}
      </div>
    </div>
  );
}
