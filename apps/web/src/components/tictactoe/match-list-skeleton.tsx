"use client";

import { Bone, SessionHint, TextLine } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/**
 * La lista de partidas de un juego contra amigos (match-list) mientras se
 * sabe quién mira: con sesión, el botón de retar y unas partidas; sin ella,
 * el aviso de entrar (sign-in-prompt), con sus textos.
 */
export function MatchListSkeleton() {
  const m = useMessages();
  return (
    <div aria-hidden>
      <SessionHint />
      <div className="flex w-full max-w-xl flex-col gap-10 signed-out:hidden">
        <div className="flex flex-col gap-3">
          <span className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">{m.run.challengeFriend}</span>
        </div>
        <MatchRowsSkeleton />
      </div>
      <div className="flex max-w-xl flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-soft signed-in:hidden">
        <p className="font-semibold">{m.signInPrompt.title}</p>
        <p className="text-sm text-muted">{m.signInPrompt.body}</p>
        <Bone className="h-11 w-40 rounded-full" />
      </div>
    </div>
  );
}

/** Un grupo de partidas en gris (título y filas), mientras llegan. */
export function MatchRowsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1">
      <TextLine className="w-24 text-sm" />
      <ul className="flex flex-col">
        {Array.from({ length: 2 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-line py-2.5">
            <Bone className="size-9 shrink-0 rounded-full" />
            <TextLine className="w-28 min-w-0 flex-1" />
            <TextLine className="w-20 text-sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}
