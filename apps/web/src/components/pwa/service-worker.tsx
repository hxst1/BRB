"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "./install-store";

/** Registra el service worker (sin conexión y notificaciones) y escucha la instalación. */
export function ServiceWorker() {
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
