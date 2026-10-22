import { describe, expect, it } from "vitest";
import { parseKofiWebhook } from "./kofi";

const TOKEN = "11111111-2222-3333-4444-555555555555";

const body = (data: unknown) => new URLSearchParams({ data: JSON.stringify(data) }).toString();

const DONATION = {
  verification_token: TOKEN,
  message_id: "msg-1",
  kofi_transaction_id: "tx-1",
  type: "Donation",
  from_name: "Ana",
  email: "ana@example.com",
  amount: "3.00",
  currency: "EUR",
};

describe("webhook de Ko-fi", () => {
  it("acepta un aviso con el token correcto y quita el token de lo que se guarda", () => {
    const result = parseKofiWebhook(body(DONATION), TOKEN);
    expect(result).toMatchObject({ ok: true, payment: { ref: "tx-1", type: "Donation", email: "ana@example.com" } });
    if (result.ok) expect(result.payment.payload).not.toHaveProperty("verification_token");
  });

  it("rechaza un token distinto o ausente", () => {
    expect(parseKofiWebhook(body({ ...DONATION, verification_token: "otro" }), TOKEN)).toMatchObject({ ok: false, status: 401 });
    expect(parseKofiWebhook(body({ ...DONATION, verification_token: undefined }), TOKEN)).toMatchObject({ ok: false, status: 401 });
    expect(parseKofiWebhook(body(DONATION), "")).toMatchObject({ ok: false, status: 401 });
  });

  it("rechaza avisos mal formados", () => {
    expect(parseKofiWebhook("data=no-es-json", TOKEN)).toMatchObject({ ok: false, status: 400 });
    expect(parseKofiWebhook("", TOKEN)).toMatchObject({ ok: false, status: 400 });
    expect(parseKofiWebhook(body({ verification_token: TOKEN }), TOKEN)).toMatchObject({ ok: false, status: 400 });
  });

  it("saca del mensaje los posibles códigos de amigo", () => {
    const result = parseKofiWebhook(body({ ...DONATION, message: "¡Ánimo! Mi código es k7mxq, gracias" }), TOKEN);
    // Solo palabras de exactamente 5 letras o cifras, en mayúsculas y sin repetir.
    expect(result).toMatchObject({ ok: true, payment: { codes: ["K7MXQ"] } });
    expect(parseKofiWebhook(body({ ...DONATION, message: "ABCDEF y ABCDE y ABCDE" }), TOKEN)).toMatchObject({
      ok: true,
      payment: { codes: ["ABCDE"] },
    });
    expect(parseKofiWebhook(body({ ...DONATION, message: undefined }), TOKEN)).toMatchObject({ ok: true, payment: { codes: [] } });
  });

  it("usa el id del aviso si no hay id de pago, y tolera pagos sin email", () => {
    const result = parseKofiWebhook(body({ ...DONATION, kofi_transaction_id: undefined, email: "" }), TOKEN);
    expect(result).toMatchObject({ ok: true, payment: { ref: "msg-1", email: null } });
  });
});
