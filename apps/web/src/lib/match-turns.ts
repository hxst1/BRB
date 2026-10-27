import type { Match } from "@repo/db";
import { battleshipMyTurn, isTurnBased, turnOf } from "@/components/tictactoe/data";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Partidas en juego en las que el usuario espera al rival aunque no se vea por
 * los movimientos: en piedra, papel o tijera, porque ya ha elegido esta ronda;
 * en hundir la flota, porque el rival aún tiene que colocar o disparar.
 */
export async function waitingOnRival(supabase: Supabase, matches: readonly Match[], viewerId: string): Promise<Set<string>> {
  const rpsActive = matches.filter((m) => m.status === "active" && (m.game === "rps" || m.game === "rpsls"));
  const hasBattleship = matches.some((m) => m.status === "active" && m.game === "battleship");
  const [{ data: choices }, { data: battleship }] = await Promise.all([
    rpsActive.length
      ? supabase.from("match_choices").select("match_id, round").eq("player_id", viewerId).in("match_id", rpsActive.map((m) => m.id))
      : Promise.resolve({ data: [] as { match_id: string; round: number }[] }),
    hasBattleship ? supabase.rpc("get_battleship_status") : Promise.resolve({ data: [] }),
  ]);
  const roundOf = new Map(rpsActive.map((m) => [m.id, m.moves.length / 2]));
  const waiting = new Set((choices ?? []).filter((c) => roundOf.get(c.match_id) === c.round).map((c) => c.match_id));
  for (const status of battleship ?? []) {
    const match = matches.find((m) => m.id === status.match_id);
    if (match && !battleshipMyTurn(match, viewerId, status)) waiting.add(match.id);
  }
  return waiting;
}

/**
 * ¿Le toca al usuario? En los juegos por turnos, por los movimientos; en los
 * de en directo, siempre (se juega al entrar los dos); en piedra, papel o
 * tijera y hundir la flota, si no está en `waiting` (ver waitingOnRival).
 */
export function myTurnIn(match: Match, viewerId: string, waiting: ReadonlySet<string>): boolean {
  if (isTurnBased(match.game)) return turnOf(match) === (match.player_x === viewerId ? "x" : "o");
  if (match.game === "pong" || match.game === "tron" || match.game === "typing") return true;
  return !waiting.has(match.id);
}
