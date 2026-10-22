"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMessages } from "@/lib/i18n/client";
import { reportError } from "@/lib/report-error";

/**
 * Algo ha fallado al pintar una pantalla. Los errores del servidor (con
 * `digest`) ya los guarda instrumentation.ts; aquí solo se avisa de los del
 * navegador.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const m = useMessages();
  useEffect(() => {
    const fromServer = typeof error === "object" && error !== null && "digest" in error && Boolean((error as { digest?: string }).digest);
    if (!fromServer) reportError(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 pt-10 pb-16 sm:px-6">
      <h1 className="display text-5xl font-bold">{m.errors.title}</h1>
      <p className="text-muted">{m.errors.body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => retry()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          {m.errors.retry}
        </button>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          {m.common.backHome}
        </Link>
      </div>
    </main>
  );
}
