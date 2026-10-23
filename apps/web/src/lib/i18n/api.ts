import "server-only";
import { API_ERRORS_EN } from "./api-errors";
import { getRequestLocale } from "./server";

/** Response.json, con `error` en el idioma de quien hace la petición. */
export async function apiJson(body: unknown, init?: ResponseInit): Promise<Response> {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string" && (await getRequestLocale()) === "en") {
    body = { ...body, error: API_ERRORS_EN[body.error] ?? body.error };
  }
  return Response.json(body, init);
}
