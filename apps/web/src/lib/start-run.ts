import { createClient } from "@/lib/supabase/client";

export type StartedRun = { id: string; seed: number };

/** Por qué una partida no cuenta (el texto está en m.run). */
export type RunNotice = "dayChanged" | "alreadyPlayedDaily" | "offlineDaily" | "rateLimited" | "offline" | "practiceDaily" | "alreadyPlayedChallenge";

/**
 * Pide al servidor una partida de `game`: normal, o la del reto diario si se
 * pasa `daily`. Si no se puede, `run` es null y `notice` explica por qué (la
 * partida se juega igual, pero no cuenta).
 */
export async function startRun(game: string, daily = false): Promise<{ run: StartedRun | null; notice: RunNotice | null }> {
  const supabase = createClient();
  if (daily) {
    const { data, error } = await supabase.rpc("start_daily_run", { daily_game: game });
    const run = data?.[0];
    if (run && run.game === game) return { run: { id: run.id, seed: run.seed }, notice: null };
    if (run) return { run: null, notice: "dayChanged" };
    return {
      run: null,
      notice:
        error?.hint === "already_played" ? "alreadyPlayedDaily" : "offlineDaily",
    };
  }

  const { data, error } = await supabase.rpc("start_run", { game });
  const run = data?.[0];
  if (run) return { run: { id: run.id, seed: run.seed }, notice: null };
  return {
    run: null,
    notice:
      error?.hint === "rate_limited" ? "rateLimited" : "offline",
  };
}
