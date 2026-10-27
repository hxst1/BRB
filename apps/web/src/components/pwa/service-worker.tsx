"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { captureInstallPrompt } from "./install-store";

/**
 * Registra el service worker (sin conexión y notificaciones) y escucha la
 * instalación. Al tocar un aviso con la app ya abierta, si el service worker
 * no puede cambiar de página él mismo (iPhone), se lo pide a la app.
 */
export function ServiceWorker() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== "navigate" || !data.url) return;
      const target = new URL(data.url, location.origin);
      if (target.origin !== location.origin) return;
      router.push(`${target.pathname}${target.search}${target.hash}`);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  useEffect(() => {
    captureInstallPrompt();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
        console.error("No se ha podido registrar el service worker", error);
      });
    }
  }, []);
  return null;
}
