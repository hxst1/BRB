"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { brand } from "@repo/brand";
import { SupportOptions } from "./support-options";
import { WhereItGoes } from "./where-it-goes";

/** Corazón discreto junto al nombre de la app: abre el panel para apoyar el proyecto. */
export function SupportButton() {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Etiqueta torcida, tipo pegatina: llama la atención sin tapar nada. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Apoyar ${brand.name}`}
        aria-haspopup="dialog"
        className="support-sticker flex -rotate-6 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap text-white shadow-soft transition-transform hover:-rotate-2 hover:scale-105 active:scale-95"
        style={{ background: "var(--t64)" }}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
        ¡Apóyanos!
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-title"
            onClick={(event) => event.stopPropagation()}
            className="install-sheet relative flex max-h-[88dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
          >
            <button
              ref={closeButton}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div className="pr-8">
              <h2 id="support-title" className="display text-2xl leading-tight font-bold">
                Apoya {brand.name}
              </h2>
              <p className="text-sm text-muted">
                Es gratis y sin anuncios. Si te entretiene, puedes ayudar a mantenerlo. A cambio, tu monstruo estrena ropa:
                solo cosméticos, nunca ventajas en las partidas.
              </p>
            </div>
            <SupportOptions />
            <div className="rounded-2xl p-4" style={{ background: "var(--cell)" }}>
              <WhereItGoes compact />
            </div>
            <Link href="/apoyar" onClick={() => setOpen(false)} className="self-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              Ver qué incluye y a dónde va
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
