import { replay, type Mark } from "@repo/games/tictactoe";
import type { Json, Match } from "@repo/db";
import type { MatchGame } from "@/lib/games";
import { MATCH_WITH_PLAYERS as MATCH_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";

export type Player = { id: string; username: string; avatar_seed: number; avatar_parts: Json };
export type MatchWithPlayers = Match & { x: Player; o: Player };

export function markOf(match: Match, userId: string): Mark {
  return match.player_x === userId ? "x" : "o";
}

export function opponentOf(match: MatchWithPlayers, userId: string): Player {
  return match.player_x === userId ? match.o : match.x;
}

/** 3 en raya: a quién le toca según los movimientos guardados (null si no está en juego). */
export function turnOf(match: Match): Mark | null {
  return match.status === "active" ? (replay(match.moves)?.turn ?? null) : null;
}

/**
 * ¿Le toca al usuario? En el 3 en raya depende de los movimientos; en piedra,
 * papel o tijera, de si ya ha elegido en la ronda en curso (`chosen`).
 */
export function isMyTurn(match: Match, userId: string, chosen: ReadonlySet<string>): boolean {
  if (match.status !== "active") return false;
  if (match.game === "tictactoe") return turnOf(match) === markOf(match, userId);
  return !chosen.has(match.id);
}

/** Partidas de piedra, papel o tijera en las que el usuario ya ha elegido esta ronda. */
export async function fetchChosen(matches: Match[]): Promise<Set<string>> {
  const active = matches.filter((m) => m.status === "active" && m.game !== "tictactoe");
  if (active.length === 0) return new Set();
  const { data } = await createClient()
    .from("match_choices")
    .select("match_id, round")
    .in("match_id", active.map((m) => m.id));
  const round = new Map(active.map((m) => [m.id, m.moves.length / 2]));
  return new Set((data ?? []).filter((c) => round.get(c.match_id) === c.round).map((c) => c.match_id));
}

export async function fetchMatch(id: string): Promise<MatchWithPlayers | null> {
  const { data } = await createClient().from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle();
  return data;
}

export async function fetchMyMatches(games: readonly MatchGame[]): Promise<MatchWithPlayers[]> {
  const { data } = await createClient()
    .from("matches")
    .select(MATCH_SELECT)
    .in("game", [...games])
    .in("status", ["pending", "active", "finished"])
    .order("updated_at", { ascending: false })
    .limit(40);
  return data ?? [];
}

/** Reta a un amigo (o recupera la partida abierta con él) y devuelve su id. */
export async function challenge(opponentId: string, game: MatchGame = "tictactoe"): Promise<string | null> {
  const { data } = await createClient().rpc("create_match", { game, opponent: opponentId });
  return data;
}
