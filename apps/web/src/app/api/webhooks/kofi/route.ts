import { parseKofiWebhook } from "@/lib/kofi";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ko-fi avisa aquí de cada pago (ver lib/kofi.ts). El pago se asigna a la
 * cuenta cuyo código de amigo venga en el mensaje o, si no, a la del email;
 * si no encaja ninguna, se guarda igualmente para vincularlo a mano.
 */
export async function POST(request: Request) {
  const result = parseKofiWebhook(await request.text(), process.env.KOFI_VERIFICATION_TOKEN ?? "");
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

  const { payment } = result;
  const admin = createAdminClient();
  // Primero un código de amigo escrito en el mensaje; si no, el email del pago.
  let userId: string | null = null;
  for (const code of payment.codes) {
    const { data } = await admin.rpc("user_id_by_friend_code", { code });
    if (data) {
      userId = data;
      break;
    }
  }
  if (!userId && payment.email) userId = (await admin.rpc("user_id_by_email", { email: payment.email })).data;
  if (!userId) console.warn("kofi: pago sin código ni email de ninguna cuenta, revisar a mano", payment.ref);

  const { error } = await admin.rpc("apply_supporter_event", {
    provider: "kofi",
    provider_ref: payment.ref,
    event: payment.type,
    // Sin cuenta se guarda con user_id null (los tipos generados no lo reflejan).
    user_id: (userId ?? null) as string,
    active: true,
    payload: payment.payload,
  });
  if (error) {
    console.error("kofi: no se ha podido aplicar el pago", error);
    // 500 para que Ko-fi lo reintente.
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
  return Response.json({ ok: true, linked: Boolean(userId) });
}
