"use client";

import { useState } from "react";
import { brand } from "@repo/brand";
import { useMessages } from "@/lib/i18n/client";

/**
 * Tu código de amigo y un enlace de invitación (/amigos?codigo=…) que abre el
 * formulario de añadir ya relleno. En el móvil, "Compartir" abre el menú del sistema.
 */
export function FriendCode({ code }: { code: string }) {
  const m = useMessages();
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
      flash(m.friends.copyError);
    }
  }

  async function share() {
    // Con /invita, quien aún no tiene cuenta se registra y ya sale como amigo (y cuenta para el logro Embajador).
    const url = `${window.location.origin}/invita/${code}`;
    const text = m.friends.shareText(brand.name);
    if (navigator.share) {
      try {
        await navigator.share({ title: brand.name, text, url });
      } catch {
        // Cancelado por el usuario: no hay nada que hacer.
      }
    } else {
      await copy(`${text} ${url}`, m.friends.inviteCopied);
    }
  }

  return (
    <section aria-labelledby="code-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div>
        <h2 id="code-title" className="font-semibold">
          {m.friends.yourCode}
        </h2>
        <p className="text-sm text-muted">{m.friends.yourCodeHint}</p>
      </div>
      <p className="display tabular text-6xl font-bold tracking-[0.12em] select-all">{code}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void share()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          {m.friends.shareInvite}
        </button>
        <button
          type="button"
          onClick={() => void copy(code, m.friends.codeCopied)}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-muted"
        >
          {m.friends.copyCode}
        </button>
        <span aria-live="polite" className="text-sm text-muted">
          {feedback}
        </span>
      </div>
    </section>
  );
}
