import { createAdminClient } from "@/lib/supabase/admin";
import { getViewerId } from "@/lib/session";

/**
 * Errores del navegador (lib/report-error.ts). No hace falta sesión, pero si
 * la hay se apunta quién era, siempre desde la sesión y nunca desde el cuerpo.
 * Además, la base de datos guarda como mucho 100 detalles por error y hora.
 */
const MAX_BODY = 16 * 1024;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
/** Límite por IP, por instancia (suficiente para cortar un bucle; no es exacto). */
const hits = new Map<string, { count: number; since: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.since > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { count: 1, since: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.slice(0, max) : null);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return new Response(null, { status: 429 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const message = text(body.message, 1000);
  if (!message) return new Response(null, { status: 400 });

  const { error } = await createAdminClient().rpc("report_app_error", {
    message,
    stack: text(body.stack, 8000) ?? undefined,
    path: text(body.path, 300) ?? undefined,
    user_id: (await getViewerId()) ?? undefined,
    user_agent: request.headers.get("user-agent")?.slice(0, 400),
    app_version: text(body.version, 40) ?? undefined,
    source: "client",
  });
  if (error) console.error("errors: no se ha podido guardar", error.message);
  return new Response(null, { status: 204 });
}
