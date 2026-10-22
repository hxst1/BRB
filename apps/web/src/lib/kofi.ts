import { timingSafeEqual } from "node:crypto";
import type { Json } from "@repo/db";
import { codesIn } from "./friend-codes";

/**
 * Webhooks de Ko-fi: llegan como formulario con un campo `data` que es un
 * JSON, e incluyen el token de verificación de la cuenta (Ko-fi → Ajustes →
 * API). Sin dependencias del servidor para poder probarlo aislado.
 */

export type KofiPayment = {
  /** Id del pago (o del aviso, si no lo trae): evita aplicarlo dos veces. */
  ref: string;
  /** Donation, Subscription, Commission o Shop Order. */
  type: string;
  email: string | null;
  /** Posibles códigos de amigo escritos en el mensaje (para asignar el pago aunque el email sea otro). */
  codes: string[];
  /** El aviso sin el token, para guardarlo. */
  payload: Json;
};

export type KofiResult = { ok: true; payment: KofiPayment } | { ok: false; status: 400 | 401; error: string };

function sameToken(received: unknown, expected: string): boolean {
  if (typeof received !== "string" || !expected || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function parseKofiWebhook(body: string, expectedToken: string): KofiResult {
  let data: { [key: string]: Json | undefined };
  try {
    data = JSON.parse(new URLSearchParams(body).get("data") ?? "");
  } catch {
    return { ok: false, status: 400, error: "Aviso mal formado" };
  }
  if (!data || typeof data !== "object") return { ok: false, status: 400, error: "Aviso mal formado" };
  if (!sameToken(data.verification_token, expectedToken)) return { ok: false, status: 401, error: "Token no válido" };

  const ref = data.kofi_transaction_id ?? data.message_id;
  if (typeof ref !== "string" || !ref) return { ok: false, status: 400, error: "Aviso sin id" };

  const payload = { ...data };
  delete payload.verification_token;
  return {
    ok: true,
    payment: {
      ref,
      type: typeof data.type === "string" ? data.type : "Donation",
      email: typeof data.email === "string" && data.email.includes("@") ? data.email : null,
      codes: codesIn(data.message),
      payload,
    },
  };
}
