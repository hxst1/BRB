"use client";

import { useEffect, useRef, useState } from "react";
import { HOW_TO_PLAY, stepIconSrc } from "@/lib/how-to-play";
import { useLocale, useMessages } from "@/lib/i18n/client";

/** Botón "?" junto al título de un juego: abre la explicación sencilla de cómo se juega. */
export function HowToPlayButton({ game, name }: { game: string; name: string }) {
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const locale = useLocale();
  const m = useMessages();
  const guide = HOW_TO_PLAY[locale][game];

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
        aria-label={m.howTo.howToPlayGame(name)}
        title={m.howTo.howToPlay}
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
              <p className="text-sm text-muted">{m.howTo.howToPlay}</p>
              <h2 id="how-title" className="display text-3xl leading-tight font-bold">
                {name}
              </h2>
            </div>
            <p className="flex items-start gap-2 rounded-2xl p-3 font-medium" style={{ background: "var(--cell)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stepIconSrc("target")} alt="" aria-hidden className="mt-0.5 size-5 shrink-0" />
              {guide.goal}
            </p>
            <ol className="flex flex-col gap-3">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--cell)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stepIconSrc(step.icon)} alt="" className="size-7" />
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
              {m.howTo.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
