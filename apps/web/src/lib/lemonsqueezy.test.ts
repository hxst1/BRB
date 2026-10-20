import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkoutUrl, toSupporterChange, verifySignature } from "./lemonsqueezy";

const USER = "00000000-0000-0000-0000-00000000000a";

describe("verifySignature", () => {
  const body = JSON.stringify({ hola: "mundo" });
  const sign = (secret: string) => createHmac("sha256", secret).update(body).digest("hex");

  it("acepta la firma correcta", () => {
    expect(verifySignature(body, sign("secreto"), "secreto")).toBe(true);
  });

  it("rechaza firmas de otro secreto, ausentes o con el cuerpo alterado", () => {
    expect(verifySignature(body, sign("otro"), "secreto")).toBe(false);
    expect(verifySignature(body, null, "secreto")).toBe(false);
    expect(verifySignature(`${body} `, sign("secreto"), "secreto")).toBe(false);
    expect(verifySignature(body, sign("secreto"), "")).toBe(false);
  });
});

describe("toSupporterChange", () => {
  const payload = (event: string, extra: object = {}) => ({
    meta: { event_name: event, custom_data: { user_id: USER } },
    data: { id: 123, attributes: { status: "paid" } },
    ...extra,
  });

  it("un pago o una suscripción activan el apoyo", () => {
    expect(toSupporterChange(payload("order_created"))).toEqual({ providerRef: "123", event: "order_created", userId: USER, active: true });
    expect(toSupporterChange(payload("subscription_created"))?.active).toBe(true);
  });

  it("un pedido sin pagar todavía no cuenta", () => {
    expect(toSupporterChange({ ...payload("order_created"), data: { id: 1, attributes: { status: "pending" } } })?.active).toBe(false);
  });

  it("caducar o devolver el pago lo retiran; cancelar no (dura hasta que caduca)", () => {
    expect(toSupporterChange(payload("subscription_expired"))?.active).toBe(false);
    expect(toSupporterChange(payload("order_refunded"))?.active).toBe(false);
    expect(toSupporterChange(payload("subscription_cancelled"))).toBeNull();
  });

  it("ignora user_id que no sean UUID", () => {
    expect(toSupporterChange({ ...payload("order_created"), meta: { event_name: "order_created", custom_data: { user_id: "'; drop" } } })?.userId).toBeNull();
  });
});

describe("checkoutUrl", () => {
  it("vincula el pago al usuario", () => {
    const url = new URL(checkoutUrl("https://tienda.lemonsqueezy.com/checkout/buy/abc", USER, "ana@test.local"));
    expect(url.searchParams.get("checkout[custom][user_id]")).toBe(USER);
    expect(url.searchParams.get("checkout[email]")).toBe("ana@test.local");
  });
});
