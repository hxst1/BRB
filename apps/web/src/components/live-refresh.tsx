"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const WATCHED = ["messages", "matches", "friendships", "challenges"] as const;

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

    let channel = supabase.channel(`live:${viewerId}`);
    for (const table of WATCHED) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router, viewerId]);

  return null;
}
