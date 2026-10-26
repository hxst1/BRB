"use client";

import { useSyncExternalStore } from "react";
import { useMessages } from "@/lib/i18n/client";
import { isMuted, playSound, setMuted, subscribeMuted } from "@/lib/sound";

function useMuted() {
  return useSyncExternalStore(subscribeMuted, isMuted, () => false);
}

function toggle(muted: boolean) {
  setMuted(!muted);
  // Al activarlo, un toque para que se oiga cómo suena.
  if (muted) playSound("tap");
}

/** Altavoz junto al "¿Cómo se juega?" de cada juego: activa o silencia los sonidos. */
export function SoundToggle() {
  const m = useMessages();
  const muted = useMuted();
  return (
    <button
      type="button"
      onClick={() => toggle(muted)}
      aria-pressed={muted}
      aria-label={muted ? m.sound.unmute : m.sound.mute}
      title={muted ? m.sound.unmute : m.sound.mute}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted shadow-soft transition-colors hover:border-muted hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {muted ? (
          <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

/** Lo mismo, en Ajustes. */
export function SoundSetting() {
  const m = useMessages();
  const muted = useMuted();
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{m.sound.title}</p>
      <p className="text-sm text-muted">{m.sound.hint}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-sm">{muted ? m.sound.off : m.sound.on}</span>
        <button type="button" onClick={() => toggle(muted)} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {muted ? m.sound.unmute : m.sound.mute}
        </button>
      </div>
    </div>
  );
}
