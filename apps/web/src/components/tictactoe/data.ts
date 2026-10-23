import { replay as replayChess } from "@repo/games/chess";
import { replay as replayConnect4 } from "@repo/games/connect4";
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

/** Juegos por turnos (3 y 4 en raya): el turno se deduce de los movimientos. */
export function isTurnBased(game: string): game is "tictactoe" | "connect4" | "chess" {
  return game === "tictactoe" || game === "connect4" || game === "chess";
}

/** 3 y 4 en raya y ajedrez: a quién le toca según los movimientos guardados (null si no está en juego). */
export function turnOf(match: Match): Mark | null {
  if (match.status !== "active") return null;
  const state = match.game === "connect4" ? replayConnect4(match.moves) : match.game === "chess" ? replayChess(match.moves) : replay(match.moves);
  return state?.turn ?? null;
}

/**
 * ¿Le toca al usuario? En el 3 en raya depende de los movimientos; en piedra,
 * papel o tijera, de si ya ha elegido en la ronda en curso (`chosen`).
 */
export function isMyTurn(match: Match, userId: string, chosen: ReadonlySet<string>): boolean {
  if (match.status !== "active") return false;
  if (isTurnBased(match.game)) return turnOf(match) === markOf(match, userId);
  // Pong y Tron: aceptada, se juega en directo cuando estéis los dos.
  if (match.game === "pong" || match.game === "tron") return true;
  return !chosen.has(match.id);
}

/**
 * Hundir la flota: ¿le toca al usuario? Primero, colocar su flota; con las
 * dos colocadas, disparar en su turno (X con un número par de disparos).
 */
export function battleshipMyTurn(match: Match, userId: string, status: { me_ready: boolean; rival_ready: boolean }): boolean {
  if (!status.me_ready) return true;
  return status.rival_ready && (match.moves.length % 2 === 0) === (match.player_x === userId);
}

/**
 * Partidas en juego en las que ahora no le toca al usuario aunque no se vea
 * por los movimientos: en piedra, papel o tijera, porque ya ha elegido esta
 * ronda; en hundir la flota, porque espera al rival (colocar o disparar).
 */
export async function fetchChosen(matches: Match[], userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const waiting = new Set<string>();

  const rps = matches.filter((m) => m.status === "active" && (m.game === "rps" || m.game === "rpsls"));
  if (rps.length > 0) {
    const { data } = await supabase.from("match_choices").select("match_id, round").in("match_id", rps.map((m) => m.id));
    const round = new Map(rps.map((m) => [m.id, m.moves.length / 2]));
    for (const c of data ?? []) if (round.get(c.match_id) === c.round) waiting.add(c.match_id);
  }

  if (matches.some((m) => m.status === "active" && m.game === "battleship")) {
    const { data } = await supabase.rpc("get_battleship_status");
    for (const status of data ?? []) {
      const match = matches.find((m) => m.id === status.match_id);
      if (match && !battleshipMyTurn(match, userId, status)) waiting.add(match.id);
    }
  }
  return waiting;
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
