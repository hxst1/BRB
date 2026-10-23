import { recordVisit, type Visit } from "@/lib/visits";

const KINDS = new Set(["pageview", "leave"]);

/**
 * Recibe las visitas del componente <VisitTracker>. Siempre responde 204: una
 * página nunca espera por las estadísticas. Solo cuenta las de la propia web.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const sameSite = !origin || new URL(origin).host === new URL(request.url).host;
  const body = (await request.json().catch(() => null)) as Partial<Visit> | null;

  if (sameSite && body && KINDS.has(body.kind ?? "") && typeof body.path === "string") {
    await recordVisit(request.headers, {
      kind: body.kind as Visit["kind"],
      path: body.path,
      lang: typeof body.lang === "string" ? body.lang : "",
      referrer: typeof body.referrer === "string" ? body.referrer : "",
      width: typeof body.width === "number" ? body.width : undefined,
      signedIn: body.signedIn === true,
      seconds: body.kind === "leave" && typeof body.seconds === "number" ? body.seconds : undefined,
    });
  }
  return new Response(null, { status: 204 });
}
