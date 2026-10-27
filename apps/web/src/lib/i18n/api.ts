import "server-only";
import { API_ERRORS } from "./api-errors";
import { getRequestLocale } from "./server";

/** Response.json, con `error` en el idioma de quien hace la petición. */
export async function apiJson(body: unknown, init?: ResponseInit): Promise<Response> {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    const locale = await getRequestLocale();
    if (locale !== "es") body = { ...body, error: API_ERRORS[locale][body.error] ?? body.error };
  }
  return Response.json(body, init);
}
