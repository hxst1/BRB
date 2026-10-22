import { createClient } from "@/lib/supabase/client";

export type StartedRun = { id: string; seed: number };

/**
 * Pide al servidor una partida de `game`: normal, o la del reto diario si se
 * pasa `daily`. Si no se puede, `run` es null y `notice` explica por qué (la
 * partida se juega igual, pero no cuenta).
 */
export async function startRun(game: string, daily = false): Promise<{ run: StartedRun | null; notice: string | null }> {
  const supabase = createClient();
  if (daily) {
    const { data, error } = await supabase.rpc("start_daily_run");
    const run = data?.[0];
    if (run && run.game === game) return { run: { id: run.id, seed: run.seed }, notice: null };
    if (run) return { run: null, notice: "El reto ha cambiado: ya es otro día. Recarga la página para jugar el de hoy." };
    return {
      run: null,
      notice:
        error?.hint === "already_played"
          ? "Ya has jugado el reto de hoy. Esta partida no contará."
          : "No hemos podido conectar. Esta partida no contará para el reto.",
    };
  }

  const { data, error } = await supabase.rpc("start_run", { game });
  const run = data?.[0];
  if (run) return { run: { id: run.id, seed: run.seed }, notice: null };
  return {
    run: null,
    notice:
      error?.hint === "rate_limited"
        ? "Has empezado muchas partidas seguidas. Esta no contará para el ranking."
        : "No hemos podido conectar. Esta partida no contará para el ranking.",
  };
}
