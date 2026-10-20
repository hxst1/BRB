import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhooks de Lemon Squeezy: verificación de la firma y traducción de cada
 * evento a "esta persona apoya / ya no apoya". Sin dependencias del servidor
 * para poder probarlo aislado.
 */

export type SupporterChange = {
  /** Id del pedido o de la suscripción en Lemon Squeezy. */
  providerRef: string;
  event: string;
  userId: string | null;
  active: boolean;
};

/** Eventos que dan el estado de supporter (pago único o suscripción activa). */
const ACTIVATING = new Set(["order_created", "subscription_created", "subscription_resumed", "subscription_payment_success"]);
/** Eventos que lo quitan. Cancelar no lo quita: sigue activa hasta que caduca. */
const DEACTIVATING = new Set(["subscription_expired", "order_refunded"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La firma es el HMAC-SHA256 en hexadecimal del cuerpo tal cual llega. */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

type Payload = {
  meta?: { event_name?: string; custom_data?: { user_id?: unknown } };
  data?: { id?: string | number; attributes?: { status?: string } };
};

/** null si el evento no cambia nada (o no se reconoce). */
export function toSupporterChange(payload: Payload): SupporterChange | null {
  const event = payload.meta?.event_name;
  const ref = payload.data?.id;
  if (!event || ref === undefined) return null;

  let active: boolean;
  if (ACTIVATING.has(event)) {
    // Un pedido que no está pagado (p. ej. pendiente) todavía no cuenta.
    const status = payload.data?.attributes?.status;
    active = event !== "order_created" || status === undefined || status === "paid";
  } else if (DEACTIVATING.has(event)) {
    active = false;
  } else {
    return null;
  }

  const userId = payload.meta?.custom_data?.user_id;
  return {
    providerRef: String(ref),
    event,
    userId: typeof userId === "string" && UUID.test(userId) ? userId : null,
    active,
  };
}

/** Enlace de pago con el usuario vinculado (Lemon Squeezy lo devuelve en custom_data). */
export function checkoutUrl(baseUrl: string, userId: string, email?: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("checkout[custom][user_id]", userId);
  if (email) url.searchParams.set("checkout[email]", email);
  return url.toString();
}
