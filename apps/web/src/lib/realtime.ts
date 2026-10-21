import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Nombre único para un canal de Realtime que solo escucha cambios de la base
 * de datos. supabase-js reutiliza un canal si ya hay otro con el mismo nombre,
 * y en desarrollo React monta los efectos dos veces: el segundo canal sería el
 * primero a medio cerrar y la página se quedaría sin avisos.
 *
 * No usar en canales cuyo nombre importa (p. ej. `pong:<id>`, con permisos por nombre).
 */
export function channelName(name: string): string {
  return `${name}:${crypto.randomUUID()}`;
}

/**
 * Crea el canal (con su `.subscribe()`) cuando la sesión ya está cargada.
 * Si se une antes, Realtime lo une como anónimo y, con RLS, no llega ningún
 * cambio aunque el usuario tenga permiso. Devuelve la función para cerrarlo.
 */
export function subscribeWhenReady(supabase: SupabaseClient, create: () => RealtimeChannel): () => void {
  let channel: RealtimeChannel | null = null;
  let closed = false;
  void supabase.auth.getSession().then(async ({ data }) => {
    if (data.session) await supabase.realtime.setAuth(data.session.access_token);
    if (!closed) channel = create();
  });
  return () => {
    closed = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
