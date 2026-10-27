"use client";

import { useState } from "react";
import { brand } from "@repo/brand";
import { groupInviteUrl } from "@/lib/groups";
import { useMessages } from "@/lib/i18n/client";

/** El enlace para entrar en el grupo. En el móvil, "Compartir" abre el menú del sistema. */
export function GroupInvite({ name, code }: { name: string; code: string }) {
  const m = useMessages();
  const [feedback, setFeedback] = useState<string | null>(null);

  function flash(text: string) {
    setFeedback(text);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(m.groups.copied);
    } catch {
      flash(m.friends.copyError);
    }
  }

  async function share() {
    const url = groupInviteUrl(window.location.origin, code);
    const text = m.groups.shareText(name, brand.name);
    if (navigator.share) {
      try {
        await navigator.share({ title: brand.name, text, url });
      } catch {
        // Cancelado por el usuario: no hay nada que hacer.
      }
    } else {
      await copy(`${text} ${url}`);
    }
  }

  return (
    <section aria-labelledby="invite-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div>
        <h2 id="invite-title" className="font-semibold">
          {m.groups.invite}
        </h2>
        <p className="text-sm text-muted">{m.groups.inviteHint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void share()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          {m.groups.share}
        </button>
        <button
          type="button"
          onClick={() => void copy(groupInviteUrl(window.location.origin, code))}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-muted"
        >
          {m.groups.copy}
        </button>
        <span aria-live="polite" className="text-sm text-muted">
          {feedback}
        </span>
      </div>
    </section>
  );
}
