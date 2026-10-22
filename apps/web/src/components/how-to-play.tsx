"use client";

import { useEffect, useRef, useState } from "react";
import { HOW_TO_PLAY } from "@/lib/how-to-play";

/** Botón "?" junto al título de un juego: abre la explicación sencilla de cómo se juega. */
export function HowToPlayButton({ game, name }: { game: string; name: string }) {
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const guide = HOW_TO_PLAY[game];

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!guide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Cómo se juega al ${name}`}
        title="¿Cómo se juega?"
        className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-lg font-bold text-muted shadow-soft transition-colors hover:border-muted hover:text-ink"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-title"
            onClick={(event) => event.stopPropagation()}
            className="install-sheet relative flex max-h-[88dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
          >
            <div className="pr-10">
              <p className="text-sm text-muted">¿Cómo se juega?</p>
              <h2 id="how-title" className="display text-3xl leading-tight font-bold">
                {name}
              </h2>
            </div>
            <p className="rounded-2xl p-3 font-medium" style={{ background: "var(--cell)" }}>
              🎯 {guide.goal}
            </p>
            <ol className="flex flex-col gap-3">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: "var(--cell)" }}>
                    {step.icon}
                  </span>
                  <span className="pt-2 text-sm">{step.text}</span>
                </li>
              ))}
            </ol>
            <button
              ref={close}
              type="button"
              onClick={() => setOpen(false)}
              className="self-stretch rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
