"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/**
 * Falla el propio layout: esta pantalla sustituye a todo (sin estilos de la
 * app), así que lleva los suyos, con los colores del tema.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const fromServer = typeof error === "object" && error !== null && "digest" in error && Boolean((error as { digest?: string }).digest);
    if (!fromServer) reportError(error);
  }, [error]);

  return (
    <html lang="es">
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
        <title>Algo ha fallado</title>
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 40, letterSpacing: "-0.03em" }}>Algo ha fallado</h1>
          <p style={{ margin: 0, color: "#959bab" }}>Ya nos ha llegado el aviso. Prueba otra vez en un momento.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ alignSelf: "flex-start", border: 0, borderRadius: 999, padding: "10px 20px", fontWeight: 600, background: "#f1f2f5", color: "#111318", cursor: "pointer" }}
          >
            Probar otra vez
          </button>
        </div>
      </body>
    </html>
  );
}
