import "server-only";
import { createHash } from "node:crypto";
import { isLocale } from "@/lib/i18n/locales";
import { createAdminClient } from "@/lib/supabase/admin";

/** Navegadores automáticos y buscadores: no son visitas. */
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|phantom|puppeteer|playwright|selenium|facebookexternalhit|whatsapp/i;

export type Visit = {
  kind: "pageview" | "leave" | "signup";
  path?: string;
  lang?: string;
  referrer?: string;
  /** Ancho de la pantalla, para saber el tipo de dispositivo. */
  width?: number;
  signedIn?: boolean;
  seconds?: number;
};

/** Día en Madrid (AAAA-MM-DD): la huella cambia cada día, como el día de juego. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

/**
 * Huella del visitante: hash de IP + navegador con una sal secreta y el día.
 * Cuenta visitantes únicos de un día sin cookies ni guardar la IP, y no
 * permite seguir a nadie de un día a otro.
 */
function visitorOf(headers: Headers): string | null {
  const secret = process.env.ANALYTICS_SECRET;
  const ua = headers.get("user-agent") ?? "";
  if (!secret || !ua || BOTS.test(ua)) return null;
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
  return createHash("sha256").update(`${secret}|${today()}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

function deviceOf(width: number | undefined): string {
  if (!width) return "";
  return width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

/** Guarda una visita. Nunca falla: las estadísticas no pueden romper nada. */
export async function recordVisit(headers: Headers, visit: Visit): Promise<void> {
  const visitor = visitorOf(headers);
  if (!visitor) return;
  const country = headers.get("x-vercel-ip-country") ?? "";
  const { error } = await createAdminClient().rpc("record_visit", {
    kind: visit.kind,
    visitor,
    path: (visit.path ?? "").slice(0, 120),
    lang: isLocale(visit.lang) ? visit.lang : "",
    referrer: (visit.referrer ?? "").slice(0, 80),
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    device: deviceOf(visit.width),
    signed_in: visit.signedIn ?? false,
    seconds: visit.seconds === undefined ? undefined : Math.round(visit.seconds),
  });
  if (error) console.error("visits: no se ha podido guardar", error.message);
}
