"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { channelName, subscribeWhenReady } from "@/lib/realtime";

const WATCHED = ["messages", "matches", "friendships", "challenges"] as const;
/** Tiempo fuera a partir del cual, al volver, se recarga (un vistazo a otra pestaña no cuenta). */
const AWAY_MS = 15_000;

/**
 * Refresca los datos del servidor (avisos de la cabecera, panel de inicio)
 * cuando cambia algo que afecta al usuario. RLS hace que solo lleguen sus
 * cambios. El estado de los componentes cliente se conserva.
 */
export function LiveRefresh({ viewerId }: { viewerId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Varios cambios seguidos (p. ej. una jugada) se agrupan en un solo refresco.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const unsubscribe = subscribeWhenReady(supabase, () => {
      let channel = supabase.channel(channelName(`live:${viewerId}`));
      for (const table of WATCHED) {
        channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
      }
      return channel.subscribe();
    });

    // Con el móvil bloqueado o la pestaña en segundo plano, la conexión se cae
    // y lo que pase mientras no llega: al volver (o al recuperar la red), se recarga.
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", refresh);

    return () => {
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", refresh);
    };
  }, [router, viewerId]);

  return null;
}
