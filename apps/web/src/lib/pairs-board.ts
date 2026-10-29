import "server-only";
import { createHmac } from "node:crypto";
import { dealBoard, type Board } from "@repo/games/pairs";

/**
 * Tablero de una partida de Parejas con sesión. Sale de la partida y de un
 * secreto del servidor (la secret key de Supabase), así que conocer la semilla
 * (el jugador puede leerla) no sirve para saber dónde está cada monstruo.
 */
export function pairsBoard(runId: string, seed: number): Board {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Falta la variable de entorno SUPABASE_SECRET_KEY");
  const digest = createHmac("sha256", secret).update(`pairs-board:${runId}:${seed}`).digest();
  return dealBoard(digest.readUInt32BE(0));
}
