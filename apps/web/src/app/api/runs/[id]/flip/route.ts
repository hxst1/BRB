import { canFlip, encodeCard, replay } from "@repo/games/pairs";
import { pairsBoard } from "@/lib/pairs-board";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";
import { apiJson } from "@/lib/i18n/api";

/**
 * Gira una carta de Parejas: comprueba que se puede, la apunta en la partida
 * y devuelve qué monstruo es. Así el navegador solo conoce las cartas que ha
 * girado, y la partida se valida al final con los giros apuntados aquí.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/runs/[id]/flip">) {
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const card = (body as { card?: unknown } | null)?.card;
  if (typeof card !== "number" || !Number.isInteger(card)) {
    return apiJson({ error: "Carta no válida" }, { status: 400 });
  }

  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) return apiJson({ error: "Hay que iniciar sesión" }, { status: 401 });

  // Con el cliente del usuario: RLS garantiza que la partida es suya.
  const { data: run, error: runError } = await supabase
    .from("game_runs")
    .select("id, game, seed, status, moves")
    .eq("id", id)
    .maybeSingle();
  if (runError) {
    console.error("flip: error leyendo la partida", runError);
    return apiJson({ error: "Error interno" }, { status: 500 });
  }
  if (!run || run.game !== "pairs") return apiJson({ error: "Partida no encontrada" }, { status: 404 });
  if (run.status !== "playing") return apiJson({ error: "La partida ya está cerrada" }, { status: 409 });

  const board = pairsBoard(run.id, run.seed);
  const flips = run.moves ?? "";
  const played = replay(board, flips);
  if (!played.valid || !canFlip(played.state, card)) {
    return apiJson({ error: "No se puede girar esa carta" }, { status: 409 });
  }

  const { data: recorded, error } = await createAdminClient().rpc("record_pairs_flip", {
    run_id: run.id,
    previous_count: flips.length,
    flip: encodeCard(card),
  });
  if (error) {
    console.error("flip: error apuntando el giro", error);
    return apiJson({ error: "Error interno" }, { status: 500 });
  }
  // Otro giro ha entrado a la vez, o la partida se ha cerrado entre medias.
  if (!recorded) return apiJson({ error: "No se puede girar esa carta" }, { status: 409 });

  return Response.json({ pair: board[card] });
}
