import { verifyRun } from "@repo/games/2048/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";

const MAX_MOVES_LENGTH = 100_000;

/** Código que lanzan finish_run/reject_run cuando la partida ya no está en curso. */
const RUN_NOT_PLAYING = "P0002";

const alreadyClosed = () => Response.json({ error: "La partida ya está cerrada" }, { status: 409 });
const serverError = () => Response.json({ error: "Error interno" }, { status: 500 });

/**
 * Cierra una partida: el cliente envía solo los movimientos y el servidor
 * recalcula la puntuación repitiendo la partida desde la semilla.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/runs/[id]/finish">) {
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const moves = (body as { moves?: unknown } | null)?.moves;
  if (typeof moves !== "string" || moves.length === 0 || moves.length > MAX_MOVES_LENGTH) {
    return Response.json({ error: "Movimientos no válidos" }, { status: 400 });
  }

  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) {
    return Response.json({ error: "Hay que iniciar sesión" }, { status: 401 });
  }

  // Con el cliente del usuario: RLS garantiza que la partida es suya.
  const { data: run, error: runError } = await supabase
    .from("game_runs")
    .select("id, game, seed, status, started_at")
    .eq("id", id)
    .maybeSingle();

  if (runError) {
    console.error("finish: error leyendo la partida", runError);
    return serverError();
  }
  if (!run || run.game !== "2048") {
    return Response.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  if (run.status !== "playing") {
    return alreadyClosed();
  }

  const elapsedMs = Date.now() - new Date(run.started_at).getTime();
  const result = verifyRun(run.seed, moves, elapsedMs);
  const admin = createAdminClient();

  const { error } = result.valid
    ? await admin.rpc("finish_run", { run_id: run.id, moves, score: result.score, max_tile: result.maxTile })
    : await admin.rpc("reject_run", { run_id: run.id, reason: result.reason });

  if (error?.code === RUN_NOT_PLAYING) {
    // Dos envíos simultáneos, o se empezó otra partida entre medias.
    return alreadyClosed();
  }
  if (error) {
    console.error("finish: error cerrando la partida", error);
    return serverError();
  }

  return result.valid
    ? Response.json({ status: "finished", score: result.score, maxTile: result.maxTile })
    : Response.json({ status: "rejected" }, { status: 422 });
}
