import { replay, type Mark } from "@repo/games/tictactoe";
import type { Json, Match } from "@repo/db";
import { createClient } from "@/lib/supabase/client";

export type Player = { id: string; username: string; avatar_seed: number; avatar_parts: Json };
export type MatchWithPlayers = Match & { x: Player; o: Player };

const PLAYER = "id, username, avatar_seed, avatar_parts";
export const MATCH_SELECT = `*, x:profiles!matches_player_x_fkey(${PLAYER}), o:profiles!matches_player_o_fkey(${PLAYER})`;

export function markOf(match: Match, userId: string): Mark {
  return match.player_x === userId ? "x" : "o";
}

export function opponentOf(match: MatchWithPlayers, userId: string): Player {
  return match.player_x === userId ? match.o : match.x;
}

/** A quién le toca según los movimientos guardados (null si no está en juego). */
export function turnOf(match: Match): Mark | null {
  return match.status === "active" ? (replay(match.moves)?.turn ?? null) : null;
}

export async function fetchMatch(id: string): Promise<MatchWithPlayers | null> {
  const { data } = await createClient().from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle();
  return data;
}

export async function fetchMyMatches(): Promise<MatchWithPlayers[]> {
  const { data } = await createClient()
    .from("matches")
    .select(MATCH_SELECT)
    .eq("game", "tictactoe")
    .in("status", ["pending", "active", "finished"])
    .order("updated_at", { ascending: false })
    .limit(40);
  return data ?? [];
}

/** Reta a un amigo (o recupera la partida abierta con él) y devuelve su id. */
export async function challenge(opponentId: string): Promise<string | null> {
  const { data } = await createClient().rpc("create_match", { game: "tictactoe", opponent: opponentId });
  return data;
}
