"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameIcon } from "@/components/game-icon";
import { challenge } from "@/components/tictactoe/data";
import { matchHref, type MatchGame } from "@/lib/games";
import { useMessages } from "@/lib/i18n/client";

/** Las etiquetas están en m.challengeMenu. */
const OPTIONS: MatchGame[] = ["tictactoe", "connect4", "battleship", "rps", "rpsls", "pong", "tron", "chess"];

/**
 * "Retar ▾": elige a qué juego retar a un amigo. Si ya tenéis una partida
 * abierta de ese juego, lleva a ella.
 */
export function ChallengeMenu({ friendId, className = "" }: { friendId: string; className?: string }) {
  const router = useRouter();
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pick(game: MatchGame) {
    setBusy(true);
    setError(false);
    const id = await challenge(friendId, game);
    setBusy(false);
    if (id) {
      setOpen(false);
      router.push(matchHref({ id, game }));
    } else {
      setError(true);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-sm font-medium text-bg disabled:opacity-50 ${className}`}
      >
        {m.challengeMenu.challenge}
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-64 rounded-3xl bg-surface p-2 shadow-lift">
          {OPTIONS.map((game) => (
            <button
              key={game}
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => void pick(game)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-bg disabled:opacity-50"
            >
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: "var(--board)" }}>
                <GameIcon name={game} className="size-6" />
              </span>
              {m.challengeMenu[game]}
            </button>
          ))}
          {error && <p className="px-3 pb-1 text-xs text-danger">{m.challengeMenu.error}</p>}
        </div>
      )}
    </div>
  );
}
