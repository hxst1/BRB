import { isValidFleet } from "@repo/games/battleship";
import { sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";
import { apiJson } from "@/lib/i18n/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hundir la flota: valida la flota del jugador y la guarda (el rival no la verá hasta el final). */
export async function POST(request: Request, { params }: RouteContext<"/api/matches/[id]/fleet">) {
  const { id } = await params;
  if (!UUID.test(id)) return apiJson({ error: "Partida no encontrada" }, { status: 404 });

  const { userId } = await createClientForRequest(request);
  if (!userId) return apiJson({ error: "Hay que iniciar sesión" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { ships?: unknown } | null;
  if (!isValidFleet(body?.ships)) return apiJson({ error: "Flota no válida" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_battleship_fleet", {
    match_id: id,
    player_id: userId,
    ships: body.ships,
  });
  if (error?.hint === "already_placed") return apiJson({ error: "Ya has colocado tu flota" }, { status: 409 });
  if (error?.hint === "started") return apiJson({ error: "La partida ya ha empezado" }, { status: 409 });
  if (error?.code === "P0002") return apiJson({ error: "Partida no encontrada o no está en juego" }, { status: 404 });
  if (error) {
    console.error("fleet: error guardando la flota", error);
    return apiJson({ error: "Error interno" }, { status: 500 });
  }
  await notifyFirstShooter(admin, id, userId);
  return Response.json({ ok: true });
}

/**
 * Si con esta flota ya están las dos y quien dispara primero (X) es el rival,
 * se le avisa: colocar no cambia los movimientos, así que el aviso general
 * (trigger de matches) no salta.
 */
async function notifyFirstShooter(admin: ReturnType<typeof createAdminClient>, matchId: string, userId: string) {
  const [{ data: match }, { count }] = await Promise.all([
    admin.from("matches").select("player_x, x:profiles!matches_player_x_fkey(username), o:profiles!matches_player_o_fkey(username)").eq("id", matchId).single(),
    admin.from("battleship_fleets").select("player_id", { count: "exact", head: true }).eq("match_id", matchId),
  ]);
  if (!match || count !== 2 || match.player_x === userId) return;
  await sendPush(match.player_x, (m) => ({
    title: m.battleship.yourShot,
    body: m.push.fleetReady(match.o.username),
    url: `/hundir-la-flota/${matchId}`,
    tag: `match:${matchId}`,
  })).catch((pushError) => console.error("fleet: no se pudo avisar", pushError));
}
