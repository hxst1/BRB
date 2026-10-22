/**
 * Avisa de un error del navegador a /api/errors (de ahí, al panel de admin).
 * Con sendBeacon, que no espera ni bloquea, y como mucho 3 veces el mismo
 * mensaje por página, para que un error en bucle no mande cientos de avisos.
 */
const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
const sent = new Map<string, number>();

export function reportError(error: unknown) {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Error desconocido");
  const times = sent.get(message) ?? 0;
  if (times >= 3) return;
  sent.set(message, times + 1);

  const body = JSON.stringify({
    message: message.slice(0, 1000),
    stack: error instanceof Error ? error.stack?.slice(0, 8000) : undefined,
    path: window.location.pathname,
    version: APP_VERSION,
  });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/errors", blob)) {
      void fetch("/api/errors", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch {
    // Avisar de un error nunca debe provocar otro.
  }
}
