"use client";

import { useState } from "react";

export function FriendCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el código sigue visible para copiarlo a mano.
    }
  }

  return (
    <section aria-labelledby="code-title" className="flex flex-col gap-3">
      <h2 id="code-title" className="text-xl font-semibold">
        Tu código de amigo
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        <p className="display tabular rounded-2xl bg-surface px-5 py-3 text-5xl font-bold tracking-[0.12em] shadow-soft select-all">
          {code}
        </p>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-soft hover:border-muted"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="text-sm text-muted">Pásaselo a quien quieras retar. Con él te pueden enviar una solicitud.</p>
    </section>
  );
}
