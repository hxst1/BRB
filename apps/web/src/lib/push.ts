import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushMessage = {
  title: string;
  body: string;
  /** Página que se abre al tocar la notificación. */
  url: string;
  /** Notificaciones con el mismo tag se sustituyen (p. ej. varios mensajes del mismo amigo). */
  tag: string;
};

/** Presencia más reciente que esto cuenta como "lo está mirando ahora" (se renueva cada 20 s). */
const PRESENCE_MS = 45_000;

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hola@example.com", publicKey, privateKey);
  configured = true;
  return true;
}

/** ¿Tiene el usuario esa pantalla a la vista ahora mismo? (ver set_presence) */
async function isWatching(admin: ReturnType<typeof createAdminClient>, userId: string, url: string): Promise<boolean> {
  const { data } = await admin.from("presence").select("path, seen_at").eq("user_id", userId).maybeSingle();
  return data?.path === url && Date.now() - new Date(data.seen_at).getTime() < PRESENCE_MS;
}

/**
 * Envía la notificación a todos los dispositivos del usuario, salvo que esté
 * mirando justo esa pantalla (la partida o el chat): ahí el aviso sobra. Las
 * suscripciones que el navegador ya ha dado de baja (404/410) se borran.
 */
export async function sendPush(userId: string, message: PushMessage): Promise<number> {
  if (!configure()) return 0;
  const admin = createAdminClient();
  if (await isWatching(admin, userId, message.url)) return 0;
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(message),
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push: no se ha podido enviar", status, error);
        }
      }
    }),
  );
  return sent;
}
