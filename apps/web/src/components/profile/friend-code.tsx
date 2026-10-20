"use client";

import { useState } from "react";
import { brand } from "@repo/brand";

/**
 * Tu código de amigo y un enlace de invitación (/amigos?codigo=…) que abre el
 * formulario de añadir ya relleno. En el móvil, "Compartir" abre el menú del sistema.
 */
export function FriendCode({ code }: { code: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function flash(text: string) {
    setFeedback(text);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      flash("No se ha podido copiar. Cópialo a mano.");
    }
  }

  async function share() {
    const url = `${window.location.origin}/amigos?codigo=${code}`;
    const text = `Añádeme en ${brand.name} y echamos una partida. Mi código es ${code}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: brand.name, text, url });
      } catch {
        // Cancelado por el usuario: no hay nada que hacer.
      }
    } else {
      await copy(`${text} ${url}`, "Invitación copiada");
    }
  }

  return (
    <section aria-labelledby="code-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div>
        <h2 id="code-title" className="font-semibold">
          Tu código de amigo
        </h2>
        <p className="text-sm text-muted">Con él te pueden añadir. Compártelo con quien quieras retar.</p>
      </div>
      <p className="display tabular text-6xl font-bold tracking-[0.12em] select-all">{code}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void share()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          Compartir invitación
        </button>
        <button
          type="button"
          onClick={() => void copy(code, "Código copiado")}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-muted"
        >
          Copiar código
        </button>
        <span aria-live="polite" className="text-sm text-muted">
          {feedback}
        </span>
      </div>
    </section>
  );
}
