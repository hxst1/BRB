"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePagePath } from "@/lib/i18n/client";

/** Cada cuánto se renueva la presencia mientras la app está a la vista. */
const HEARTBEAT_MS = 20_000;

/**
 * Le dice al servidor qué pantalla tienes a la vista (o ninguna, si la app
 * está oculta), para no mandarte avisos de la partida o el chat que ya estás
 * mirando. Si se cierra sin avisar, la presencia caduca sola a los 45 s.
 */
export function PresenceReporter() {
  const pathname = usePagePath();

  useEffect(() => {
    const supabase = createClient();
    const report = () => {
      // Las consultas de supabase-js no salen hasta que se espera su resultado.
      supabase.rpc("set_presence", { path: document.visibilityState === "visible" ? pathname : "" }).then(() => undefined);
    };
    report();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") report();
    }, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", report);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", report);
    };
  }, [pathname]);

  return null;
}
