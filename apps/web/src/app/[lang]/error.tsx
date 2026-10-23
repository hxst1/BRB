"use client";

import Link from "next/link";
import { ErrorScreen } from "@/components/error-screen";
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
    <ErrorScreen
      code="500"
      monster={{ body: "ghost", palette: "sky", eyes: "two", mouth: "wobbly", top: "antenna" }}
      mood="sad"
      title={m.errors.title}
      body={m.errors.body}
    >
      <button type="button" onClick={() => retry()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.errors.retry}
      </button>
      <Link href="/" className="rounded-full border border-line px-5 py-2.5 font-semibold hover:border-muted">
        {m.common.backHome}
      </Link>
    </ErrorScreen>
  );
}
