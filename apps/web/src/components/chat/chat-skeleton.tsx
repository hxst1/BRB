"use client";

import { Bone, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/**
 * El chat (chat-shell) mientras carga: la lista de conversaciones y, con un
 * amigo elegido, su conversación; en el móvil, una cosa u otra, como el de
 * verdad. Mismo alto y mismas columnas.
 */
export function ChatSkeleton({ conversation }: { conversation: boolean }) {
  const m = useMessages();
  return (
    <div
      aria-hidden
      className="grid h-[calc(100dvh-13.5rem-env(safe-area-inset-bottom))] min-h-80 grid-cols-1 gap-8 sm:h-[calc(100dvh-11rem)] lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <div className={`-mx-2 min-h-0 overflow-hidden px-2 ${conversation ? "hidden lg:block" : ""}`}>
        <ConversationListSkeleton />
      </div>
      <div className={`min-h-0 ${conversation ? "" : "hidden lg:block"}`}>
        {conversation ? <ConversationSkeleton /> : <p className="grid h-full place-items-center text-muted">{m.chat.pick}</p>}
      </div>
    </div>
  );
}

/** Las conversaciones (conversation-list) en gris: monstruo, nombre, hora y el último mensaje. */
export function ConversationListSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="border-b border-line last:border-b-0">
          <div className="-mx-2 my-1 flex items-center gap-3 rounded-2xl px-2 py-2.5">
            <Bone className="size-12 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <TextLine className="w-24" />
                <TextLine className="w-10 text-xs" />
              </span>
              <TextLine className="w-3/4 text-sm" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Una conversación (conversation.tsx) mientras llega: la cabecera, unos
 * mensajes en gris y la caja de escribir. En el móvil, a pantalla completa
 * como la de verdad.
 */
export function ConversationSkeleton() {
  const m = useMessages();
  return (
    <div className="flex h-full min-h-0 flex-col max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-30 max-lg:h-dvh max-lg:bg-bg max-lg:px-4 max-lg:pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <span className="-ml-2 grid size-10 shrink-0 place-items-center text-muted lg:hidden">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </span>
        <Bone className="size-10 shrink-0 rounded-full" />
        <TextLine className="w-28 min-w-0 flex-1 text-lg" />
        <Bone className="h-7 w-20 rounded-full" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden py-4">
        <MessagesSkeleton />
      </div>
      <div className="flex items-end gap-2 border-t border-line pt-3 max-lg:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <span className="grid size-11 shrink-0 place-items-center text-muted">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 14.5q3.5 3 7 0" />
            <circle cx="9" cy="10" r="0.6" fill="currentColor" />
            <circle cx="15" cy="10" r="0.6" fill="currentColor" />
          </svg>
        </span>
        <span className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface" />
        <span className="grid h-11 place-items-center rounded-2xl bg-ink px-4 font-semibold text-bg opacity-40">{m.feedback.send}</span>
      </div>
    </div>
  );
}

/** Unos mensajes en gris, abajo del todo como los de verdad: de uno y de otro. */
export function MessagesSkeleton() {
  const bubbles = [
    { mine: false, width: "w-44" },
    { mine: false, width: "w-28" },
    { mine: true, width: "w-52" },
    { mine: false, width: "w-36" },
    { mine: true, width: "w-24" },
  ];
  return (
    <div aria-hidden className="flex min-h-full flex-col justify-end gap-1.5">
      {bubbles.map((bubble, i) => (
        <Bone
          key={i}
          className={`h-10 max-w-[80%] rounded-2xl ${bubble.width} ${bubble.mine ? "self-end rounded-br-md" : "self-start rounded-bl-md"}`}
        />
      ))}
    </div>
  );
}
