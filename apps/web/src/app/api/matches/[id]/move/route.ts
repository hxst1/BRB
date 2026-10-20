import { play, replay, type MoveError } from "@repo/games/tictactoe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Código que lanza apply_match_move cuando otra jugada se adelantó. */
const MATCH_CHANGED = "P0002";

const MOVE_ERRORS: Record<MoveError, string> = {
  game_over: "La partida ya ha terminado",
  not_your_turn: "No es tu turno",
  invalid_cell: "Casilla no válida",
  occupied: "Esa casilla ya está ocupada",
};

/** Valida una jugada con la lógica compartida y la guarda. */
export async function POST(request: Request, { params }: RouteContext<"/api/matches/[id]/move">) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return Response.json({ error: "Partida no encontrada" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const cell = (body as { cell?: unknown } | null)?.cell;
  if (typeof cell !== "number") {
    return Response.json({ error: "Casilla no válida" }, { status: 400 });
  }

  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) {
    return Response.json({ error: "Hay que iniciar sesión" }, { status: 401 });
  }

  // Con el cliente del usuario: RLS garantiza que juega en esta partida.
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, game, status, moves, player_x, player_o")
    .eq("id", id)
    .maybeSingle();

  if (matchError) {
    console.error("move: error leyendo la partida", matchError);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
  if (!match || match.game !== "tictactoe") {
    return Response.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  if (match.status !== "active") {
    return Response.json({ error: MOVE_ERRORS.game_over }, { status: 409 });
  }

  const state = replay(match.moves);
  if (!state) {
    console.error("move: la partida guardada no es válida", match.id);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }

  const mark = match.player_x === userId ? "x" : "o";
  const result = play(state, mark, cell);
  if (!result.ok) {
    return Response.json({ error: MOVE_ERRORS[result.error] }, { status: result.error === "not_your_turn" ? 409 : 400 });
  }

  const next = result.state;
  const { error } = await createAdminClient().rpc("apply_match_move", {
    match_id: match.id,
    previous_count: match.moves.length,
    moves: next.moves,
    end_reason: next.winner ? "line" : next.draw ? "draw" : undefined,
    winner: next.winner ?? undefined,
  });

  if (error?.code === MATCH_CHANGED) {
    return Response.json({ error: "La partida ha cambiado, recarga" }, { status: 409 });
  }
  if (error) {
    console.error("move: error guardando la jugada", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }

  return Response.json({ moves: next.moves });
}
