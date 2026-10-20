import { toSupporterChange, verifySignature } from "@/lib/lemonsqueezy";
import { createAdminClient } from "@/lib/supabase/admin";

/** Lemon Squeezy avisa aquí de pagos y suscripciones (ver lib/lemonsqueezy.ts). */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
  if (!verifySignature(raw, request.headers.get("x-signature"), secret)) {
    return Response.json({ error: "Firma no válida" }, { status: 401 });
  }

  const payload = JSON.parse(raw);
  const change = toSupporterChange(payload);
  if (!change) return Response.json({ ignored: true });
  if (!change.userId) {
    // Pago sin usuario vinculado (no pasó por /apoyar): no hay a quién aplicarlo.
    console.warn("lemonsqueezy: pago sin usuario vinculado, revisar a mano", change.providerRef, change.event);
    return Response.json({ ignored: true, reason: "sin usuario" });
  }

  const { data: applied, error } = await createAdminClient().rpc("apply_supporter_event", {
    provider_ref: change.providerRef,
    event: change.event,
    user_id: change.userId,
    active: change.active,
    payload,
  });
  if (error) {
    console.error("lemonsqueezy: no se ha podido aplicar el evento", error);
    // 500 para que Lemon Squeezy lo reintente.
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
  return Response.json({ applied });
}
