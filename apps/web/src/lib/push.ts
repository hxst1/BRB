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

/**
 * Envía la notificación a todos los dispositivos del usuario. Las
 * suscripciones que el navegador ya ha dado de baja (404/410) se borran.
 */
export async function sendPush(userId: string, message: PushMessage): Promise<number> {
  if (!configure()) return 0;
  const admin = createAdminClient();
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
