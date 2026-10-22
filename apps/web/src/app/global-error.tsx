"use client";

import { useEffect, useState } from "react";
import { messagesFor } from "@/lib/i18n";
import { LOCALE_COOKIE, pickLocale } from "@/lib/i18n/locales";
import { reportError } from "@/lib/report-error";

/** Aquí no llega el idioma del layout: se elige igual que en proxy.ts. */
function browserLocale() {
  if (typeof document === "undefined") return "es";
  const cookie = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))?.[1];
  return pickLocale(cookie, navigator.languages.join(","));
}

/**
 * Falla el propio layout: esta pantalla sustituye a todo (sin estilos de la
 * app), así que lleva los suyos, con los colores del tema.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const [locale] = useState(browserLocale);
  const m = messagesFor(locale);
  useEffect(() => {
    const fromServer = typeof error === "object" && error !== null && "digest" in error && Boolean((error as { digest?: string }).digest);
    if (!fromServer) reportError(error);
  }, [error]);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#111318",
          color: "#f1f2f5",
          padding: 24,
        }}
      >
        <title>{m.errors.title}</title>
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 40, letterSpacing: "-0.03em" }}>{m.errors.title}</h1>
          <p style={{ margin: 0, color: "#959bab" }}>{m.errors.bodyShort}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ alignSelf: "flex-start", border: 0, borderRadius: 999, padding: "10px 20px", fontWeight: 600, background: "#f1f2f5", color: "#111318", cursor: "pointer" }}
          >
            {m.errors.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
