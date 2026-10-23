"use client";

import { useEffect, useRef } from "react";
import { useLocale, usePagePath } from "@/lib/i18n/client";

/** Ids de partidas, chats, etc.: no salen del navegador (/chat/<id> cuenta como /chat/:id). */
function normalize(path: string): string {
  return path
    .split("/")
    .map((part) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part) ? ":id" : part))
    .join("/");
}

/** De dónde llega la visita: ?utm_source= o ?ref=, o el dominio que enlazó (solo la primera página). */
function source(): string {
  const params = new URLSearchParams(location.search);
  const tag = params.get("utm_source") || params.get("ref");
  if (tag) return tag;
  try {
    const host = new URL(document.referrer).hostname;
    return host === location.hostname ? "" : host;
  } catch {
    return "";
  }
}

function send(body: Record<string, unknown>) {
  const json = JSON.stringify(body);
  if (navigator.sendBeacon?.("/api/v", new Blob([json], { type: "application/json" }))) return;
  void fetch("/api/v", { method: "POST", body: json, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
}

/**
 * Estadísticas de visitas sin cookies: cada página vista y cuánto tiempo ha
 * estado a la vista (se envía al cambiar de página o al ocultarse). Sin
 * guardar nada en el navegador.
 */
export function VisitTracker({ signedIn }: { signedIn: boolean }) {
  const path = normalize(usePagePath());
  const lang = useLocale();
  const visible = useRef({ since: 0, total: 0 });
  const referrer = useRef<string | null>(null);
  /** Última página contada: en desarrollo React monta dos veces y no debe contar doble. */
  const counted = useRef<string | null>(null);

  useEffect(() => {
    const width = screen.width || window.innerWidth;
    if (referrer.current === null) referrer.current = source();
    if (counted.current !== path) send({ kind: "pageview", path, lang, referrer: referrer.current, width, signedIn });
    counted.current = path;
    referrer.current = "";
    visible.current = { since: document.visibilityState === "visible" ? performance.now() : 0, total: 0 };

    // Tiempo a la vista de esta página: se manda al ocultarse y al irse de ella.
    const flush = () => {
      const state = visible.current;
      if (state.since) state.total += performance.now() - state.since;
      state.since = 0;
      const seconds = Math.round(state.total / 1000);
      state.total = 0;
      if (seconds > 0) send({ kind: "leave", path, lang, width, signedIn, seconds: Math.min(seconds, 3600) });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else visible.current.since = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [path, lang, signedIn]);

  return null;
}
