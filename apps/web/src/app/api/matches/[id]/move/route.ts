import { isValidFleet, shoot, type Fleet, type ShotError } from "@repo/games/battleship";
import { play as playConnect4, replay as replayConnect4, type MoveError as Connect4Error } from "@repo/games/connect4";
import { isValidChoice, replay as replayRps, type Variant } from "@repo/games/rps";
import { play, replay, type MoveError } from "@repo/games/tictactoe";
import type { Match } from "@repo/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";
import { apiJson } from "@/lib/i18n/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Código que lanzan apply_match_move / submit_match_choice cuando la partida cambió o no está en juego. */
const MATCH_CHANGED = "P0002";

const MOVE_ERRORS: Record<MoveError | Connect4Error | ShotError, string> = {
  game_over: "La partida ya ha terminado",
  not_your_turn: "No es tu turno",
  invalid_cell: "Casilla no válida",
  occupied: "Esa casilla ya está ocupada",
  invalid_column: "Columna no válida",
  full: "Esa columna está llena",
  already_shot: "Ya has disparado ahí",
};

type MatchRow = Pick<Match, "id" | "game" | "status" | "moves" | "player_x" | "player_o">;

const json = (body: unknown, status = 200) => apiJson(body, { status });
const serverError = (context: string, error: unknown) => {
  console.error(`move: ${context}`, error);
  return json({ error: "Error interno" }, 500);
};

/**
 * Valida una jugada con la lógica compartida y la guarda.
 * 3 en raya: `{ cell }`. 4 en raya: `{ column }`. Hundir la flota: `{ cell }` (disparo).
 * Piedra, papel o tijera: `{ choice }` (índice de la opción).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/matches/[id]/move">) {
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Partida no encontrada" }, 404);

  const body = (await request.json().catch(() => null)) as { cell?: unknown; column?: unknown; choice?: unknown } | null;

  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) return json({ error: "Hay que iniciar sesión" }, 401);

  // Con el cliente del usuario: RLS garantiza que juega en esta partida.
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, game, status, moves, player_x, player_o")
    .eq("id", id)
    .maybeSingle();

  if (matchError) return serverError("error leyendo la partida", matchError);
  if (!match) return json({ error: "Partida no encontrada" }, 404);
  if (match.status !== "active") return json({ error: MOVE_ERRORS.game_over }, 409);

  if (match.game === "tictactoe") return playTicTacToe(match, userId, body?.cell);
  if (match.game === "connect4") return playFourInARow(match, userId, body?.column);
  if (match.game === "battleship") return fire(match, userId, body?.cell);
  if (match.game === "rps" || match.game === "rpsls") return playRps(match, match.game, userId, body?.choice);
  return json({ error: "Partida no encontrada" }, 404);
}

async function playTicTacToe(match: MatchRow, userId: string, cell: unknown) {
  if (typeof cell !== "number") return json({ error: "Casilla no válida" }, 400);

  const state = replay(match.moves);
  if (!state) return serverError("la partida guardada no es válida", match.id);

  const result = play(state, match.player_x === userId ? "x" : "o", cell);
  if (!result.ok) {
    return json({ error: MOVE_ERRORS[result.error] }, result.error === "not_your_turn" ? 409 : 400);
  }

  const next = result.state;
  const { error } = await createAdminClient().rpc("apply_match_move", {
    match_id: match.id,
    previous_count: match.moves.length,
    moves: next.moves,
    end_reason: next.winner ? "line" : next.draw ? "draw" : undefined,
    winner: next.winner ?? undefined,
  });
  if (error?.code === MATCH_CHANGED) return json({ error: "La partida ha cambiado, recarga" }, 409);
  if (error) return serverError("error guardando la jugada", error);

  return json({ moves: next.moves });
}

/** Hundir la flota: solo el servidor ve la flota del rival, así que resuelve aquí el disparo. */
async function fire(match: MatchRow, userId: string, cell: unknown) {
  if (typeof cell !== "number") return json({ error: MOVE_ERRORS.invalid_cell }, 400);

  const admin = createAdminClient();
  const { data: fleets, error: fleetError } = await admin
    .from("battleship_fleets")
    .select("player_id, ships")
    .eq("match_id", match.id);
  if (fleetError) return serverError("error leyendo las flotas", fleetError);

  const rivalId = match.player_x === userId ? match.player_o : match.player_x;
  const rivalShips = fleets?.find((f) => f.player_id === rivalId)?.ships;
  if (!fleets?.some((f) => f.player_id === userId) || !rivalShips) {
    return json({ error: "Aún falta que los dos coloquéis la flota" }, 409);
  }
  if (!isValidFleet(rivalShips)) return serverError("flota guardada no válida", match.id);

  const result = shoot(match.moves, match.player_x === userId ? "x" : "o", rivalShips as Fleet, cell);
  if (!result.ok) return json({ error: MOVE_ERRORS[result.error] }, result.error === "not_your_turn" ? 409 : 400);

  const { error } = await admin.rpc("apply_match_move", {
    match_id: match.id,
    previous_count: match.moves.length,
    moves: result.moves,
    end_reason: result.winner ? "fleet" : undefined,
    winner: result.winner ?? undefined,
  });
  if (error?.code === MATCH_CHANGED) return json({ error: "La partida ha cambiado, recarga" }, 409);
  if (error) return serverError("error guardando el disparo", error);

  return json({ moves: result.moves, result: result.result });
}

async function playFourInARow(match: MatchRow, userId: string, column: unknown) {
  if (typeof column !== "number") return json({ error: MOVE_ERRORS.invalid_column }, 400);

  const state = replayConnect4(match.moves);
  if (!state) return serverError("la partida guardada no es válida", match.id);

  const result = playConnect4(state, match.player_x === userId ? "x" : "o", column);
  if (!result.ok) {
    return json({ error: MOVE_ERRORS[result.error] }, result.error === "not_your_turn" ? 409 : 400);
  }

  const next = result.state;
  const { error } = await createAdminClient().rpc("apply_match_move", {
    match_id: match.id,
    previous_count: match.moves.length,
    moves: next.moves,
    end_reason: next.winner ? "line" : next.draw ? "draw" : undefined,
    winner: next.winner ?? undefined,
  });
  if (error?.code === MATCH_CHANGED) return json({ error: "La partida ha cambiado, recarga" }, 409);
  if (error) return serverError("error guardando la jugada", error);

  return json({ moves: next.moves });
}

/**
 * Guarda la elección (oculta para el rival). Si el rival ya había elegido,
 * resuelve la ronda y la publica en la partida.
 */
async function playRps(match: MatchRow, variant: Variant, userId: string, choice: unknown) {
  if (typeof choice !== "number" || !isValidChoice(variant, choice)) {
    return json({ error: "Elección no válida" }, 400);
  }
  if (!replayRps(variant, match.moves)) return serverError("la partida guardada no es válida", match.id);

  const admin = createAdminClient();
  const { data: rivalChoice, error } = await admin.rpc("submit_match_choice", {
    match_id: match.id,
    player_id: userId,
    choice,
  });
  if (error?.hint === "already_chosen") return json({ error: "Ya has elegido en esta ronda" }, 409);
  if (error?.code === MATCH_CHANGED) return json({ error: "La partida ha cambiado, recarga" }, 409);
  if (error) return serverError("error guardando la elección", error);

  if (rivalChoice === null) return json({ status: "waiting" });

  // submit_match_choice bloquea la partida, así que solo la segunda elección
  // de la ronda llega aquí con la del rival: no hay dos resoluciones a la vez.
  const iAmX = match.player_x === userId;
  const moves = [...match.moves, iAmX ? choice : rivalChoice, iAmX ? rivalChoice : choice];
  const next = replayRps(variant, moves);
  if (!next) return serverError("ronda no válida", { match: match.id, moves });

  const { error: applyError } = await admin.rpc("apply_match_move", {
    match_id: match.id,
    previous_count: match.moves.length,
    moves,
    end_reason: next.finished ? (next.winner ? "rounds" : "draw") : undefined,
    winner: next.winner ?? undefined,
  });
  if (applyError) return serverError("error publicando la ronda", applyError);

  return json({ status: "resolved", moves });
}
