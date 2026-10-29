import { pauseFromRun, type Pause } from "@/components/pause";
import { createClient } from "@/lib/supabase/client";

/**
 * Partidas que se retoman al volver (2048, buscaminas y Lights Out): se guardan
 * en el navegador con su semilla y sus movimientos y, al volver, se reconstruyen
 * repitiéndolos. Con sesión, solo si la partida sigue abierta en el servidor
 * (empezar otra del mismo juego, aunque sea en otro dispositivo, la abandona).
 */
export type SavedRun = { runId: string | null; seed: number; moves: string };

export function readSaved<T extends SavedRun>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSaved(key: string, saved: SavedRun | null) {
  try {
    if (saved) localStorage.setItem(key, JSON.stringify(saved));
    else localStorage.removeItem(key);
  } catch {
    // Sin almacenamiento (modo privado): simplemente no se podrá retomar.
  }
}

/** Cuándo empezó la partida en el servidor y sus pausas, para seguir el tiempo donde iba. */
export type OpenRun = { startedAt: number; pause: Pause };

/**
 * La partida guardada en `key`, si se puede seguir: con sesión, solo las del
 * servidor que sigan abiertas; sin sesión, solo las locales. Si no, la borra.
 */
export async function resumeSaved<T extends SavedRun>(key: string, signedIn: boolean): Promise<{ saved: T; run: OpenRun | null } | null> {
  const saved = readSaved<T>(key);
  if (!saved) return null;
  if (!saved.runId && !signedIn) return { saved, run: null };
  if (saved.runId && signedIn) {
    const { data } = await createClient().from("game_runs").select("status, started_at, paused_ms, paused_at").eq("id", saved.runId).maybeSingle();
    if (data?.status === "playing") return { saved, run: { startedAt: new Date(data.started_at).getTime(), pause: pauseFromRun(data) } };
  }
  writeSaved(key, null);
  return null;
}
