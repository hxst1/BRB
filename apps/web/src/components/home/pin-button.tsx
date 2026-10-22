"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/** Chincheta de una tarjeta de juego: lo fija arriba, en "Tus juegos", o lo quita. */
export function PinButton({ game, title, pinned }: { game: string; title: string; pinned: boolean }) {
  const router = useRouter();
  const [shown, setShown] = useOptimistic(pinned);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      setShown(!pinned);
      const { error: rpcError } = await createClient().rpc("toggle_pinned_game", { game });
      if (rpcError) {
        setError(rpcError.code === "P0001" ? "Como mucho 6" : "No se ha podido");
        setTimeout(() => setError(null), 2500);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="relative z-10 -mr-1.5 -mt-0.5 shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={shown}
        aria-label={shown ? `Quitar ${title} de tus juegos` : `Fijar ${title} en tus juegos`}
        title={shown ? "Quitar de tus juegos" : "Fijar en tus juegos"}
        className={`grid size-9 place-items-center rounded-full transition-colors hover:bg-line/60 ${shown ? "text-ink" : "text-muted hover:text-ink"}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill={shown ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <path d="M9 3h6l-1 6 4 3v2H6v-2l4-3z" />
          <path d="M12 14v7" fill="none" />
        </svg>
      </button>
      {error && (
        <span role="status" className="absolute top-full right-0 mt-1 rounded-full bg-ink px-2.5 py-1 text-xs font-medium whitespace-nowrap text-bg">
          {error}
        </span>
      )}
    </span>
  );
}
