import { COUNTDOWN_MS, MIN_MS_PER_CHAR, raceText, type Language } from "@repo/games/typing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";
import { apiJson } from "@/lib/i18n/api";
import { contentLanguage, isLocale } from "@/lib/i18n/locales";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) => apiJson(body, { status });
const serverError = (context: string, error: unknown) => {
  console.error(`typing: ${context}`, error);
  return json({ error: "Error interno" }, 500);
};

/**
 * Carrera de tecleo.
 * - `{ action: "start", create }`: con `create`, cada uno dice que ha entrado
 *   a la partida, y cuando han entrado los dos se fija la salida (con la
 *   cuenta atrás). Sin él, solo mira si ya había salida (al volver a la
 *   partida a media carrera). Devuelve el texto, la salida y la hora del servidor, para
 *   que el navegador ajuste su reloj; o `{ started: false }`.
 * - `{ action: "finish", typed }`: el texto escrito. Si coincide, el servidor
 *   mide el tiempo desde la salida y quien llega primero gana.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/matches/[id]/typing">) {
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Partida no encontrada" }, 404);

  const body = (await request.json().catch(() => null)) as { action?: unknown; create?: unknown; typed?: unknown } | null;

  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) return json({ error: "Hay que iniciar sesión" }, 401);

  // Con el cliente del usuario: RLS garantiza que juega en esta partida.
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, game, status, created_by")
    .eq("id", id)
    .maybeSingle();
  if (matchError) return serverError("error leyendo la partida", matchError);
  if (!match || match.game !== "typing") return json({ error: "Partida no encontrada" }, 404);
  if (match.status !== "active") return json({ error: "La partida ya ha terminado" }, 409);

  const admin = createAdminClient();

  if (body?.action === "start" && body.create !== true) {
    const { data: race, error } = await admin.from("typing_races").select("language, starts_at").eq("match_id", id).maybeSingle();
    if (error) return serverError("error leyendo la carrera", error);
    if (!race) return json({ started: false });
    return json({ text: raceText(id, race.language as Language), startsAt: race.starts_at, serverNow: new Date().toISOString() });
  }

  if (body?.action === "start") {
    // El texto va en el idioma de quien retó (si juega en japonés, en inglés:
    // aún no hay textos en japonés).
    const { data: creator } = await admin.from("profiles").select("locale").eq("id", match.created_by).maybeSingle();
    const { data, error } = await admin
      .rpc("start_typing_race", {
        match_id: id,
        player_id: userId,
        language: contentLanguage(isLocale(creator?.locale) ? creator.locale : "es"),
        countdown_ms: COUNTDOWN_MS,
      })
      .maybeSingle();
    if (error?.code === "P0002") return json({ error: "La partida ya ha terminado" }, 409);
    if (error) return serverError("error fijando la salida", error);
    // Falta que entre el otro: el navegador vuelve a preguntar al poco.
    if (!data) return json({ started: false });
    return json({
      text: raceText(id, data.race_language as Language),
      startsAt: data.starts_at,
      serverNow: data.server_now,
    });
  }

  if (body?.action === "finish") {
    if (typeof body.typed !== "string") return json({ error: "El texto no coincide" }, 400);
    const { data: race, error: raceError } = await admin.from("typing_races").select("language").eq("match_id", id).maybeSingle();
    if (raceError) return serverError("error leyendo la carrera", raceError);
    if (!race) return json({ error: "La carrera no ha empezado" }, 409);

    const text = raceText(id, race.language as Language);
    if (body.typed !== text) return json({ error: "El texto no coincide" }, 400);

    const { data: ms, error } = await admin.rpc("finish_typing_race", {
      match_id: id,
      player_id: userId,
      min_ms: text.length * MIN_MS_PER_CHAR,
    });
    if (error?.hint === "too_fast") return json({ error: "Demasiado rápido para ser de verdad" }, 400);
    if (error?.hint === "not_started") return json({ error: "La carrera no ha empezado" }, 409);
    if (error?.code === "P0002") return json({ error: "La partida ya ha terminado" }, 409);
    if (error) return serverError("error guardando el tiempo", error);
    return json({ ms });
  }

  return json({ error: "Partida no encontrada" }, 404);
}
