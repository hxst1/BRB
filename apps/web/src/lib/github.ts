import { createHmac, timingSafeEqual } from "node:crypto";
import { codesIn } from "./friend-codes";

/**
 * Webhook de GitHub del repo de la app: una issue abierta o un pull request
 * aceptado (merged) con el código de amigo de alguien en el título o la
 * descripción le da el logro «Colaborador». Sin dependencias del servidor
 * para poder probarlo aislado.
 */
export type Contribution = { kind: "issue" | "pull_request"; login: string; url: string; codes: string[] };

/** GitHub firma el cuerpo con HMAC-SHA256: cabecera X-Hub-Signature-256 = "sha256=<hex>". */
export function verifyGithubSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return expected.length === header.length && timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}

type Item = { title?: string; body?: string | null; html_url?: string; user?: { login?: string; type?: string }; merged?: boolean };

/** null si el evento no cuenta (otro tipo, una issue editada, un PR cerrado sin aceptar, un bot…). */
export function parseContribution(event: string | null, payload: { action?: string; issue?: Item; pull_request?: Item }): Contribution | null {
  const item =
    event === "issues" && payload.action === "opened"
      ? payload.issue
      : event === "pull_request" && payload.action === "closed" && payload.pull_request?.merged
        ? payload.pull_request
        : null;
  if (!item?.html_url || !item.user?.login || item.user.type === "Bot") return null;
  const codes = codesIn(`${item.title ?? ""} ${item.body ?? ""}`);
  if (codes.length === 0) return null;
  return { kind: event === "issues" ? "issue" : "pull_request", login: item.user.login, url: item.html_url, codes };
}
