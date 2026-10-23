import { verifyRun as verify2048 } from "@repo/games/2048/verify";
import { verifyRun as verifyLightsOut } from "@repo/games/lightsout/verify";
import { GAME_IDS, type Difficulty } from "@repo/games/minesweeper";
import { verifyRun as verifyMinesweeper } from "@repo/games/minesweeper/verify";
import { verifyRun as verifySnake } from "@repo/games/snake/verify";
import { GAME_IDS as SUDOKU_IDS, type Difficulty as SudokuDifficulty } from "@repo/games/sudoku";
import { verifyRun as verifySudoku } from "@repo/games/sudoku/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";
import { apiJson } from "@/lib/i18n/api";

const MAX_MOVES_LENGTH = 100_000;

/** Código que lanzan finish_run/reject_run cuando la partida ya no está en curso. */
const RUN_NOT_PLAYING = "P0002";

const alreadyClosed = () => apiJson({ error: "La partida ya está cerrada" }, { status: 409 });
const serverError = () => apiJson({ error: "Error interno" }, { status: 500 });

type Verified = { valid: true; score: number; detail: number } | { valid: false; reason: string };

/**
 * Repite la partida con el motor de su juego. En Snake, `moves` son los giros
 * (puede no haber ninguno); en Lights Out, las pulsaciones (se puede plantar
 * sin pulsar); en el buscaminas, las casillas abiertas, y en el sudoku, el
 * tablero resuelto. En estos dos, la puntuación es el tiempo que ha medido el servidor.
 */
function verify(game: string, seed: number, moves: string, elapsedMs: number): Verified | null {
  if (game === "2048") {
    if (moves.length === 0) return { valid: false, reason: "Sin movimientos" };
    const result = verify2048(seed, moves, elapsedMs);
    return result.valid ? { valid: true, score: result.score, detail: result.maxTile } : result;
  }
  if (game === "snake") {
    const result = verifySnake(seed, moves, elapsedMs);
    return result.valid ? { valid: true, score: result.score, detail: result.length } : result;
  }
  if (game === "lightsout") {
    const result = verifyLightsOut(seed, moves, elapsedMs);
    return result.valid ? { valid: true, score: result.score, detail: result.presses } : result;
  }
  const difficulty = (Object.keys(GAME_IDS) as Difficulty[]).find((d) => GAME_IDS[d] === game);
  if (difficulty) {
    const result = verifyMinesweeper(difficulty, seed, moves, elapsedMs);
    return result.valid ? { valid: true, score: result.timeMs, detail: result.opens } : result;
  }
  const sudoku = (Object.keys(SUDOKU_IDS) as SudokuDifficulty[]).find((d) => SUDOKU_IDS[d] === game);
  if (sudoku) {
    const result = verifySudoku(sudoku, seed, moves, elapsedMs);
    return result.valid ? { valid: true, score: result.timeMs, detail: result.filled } : result;
  }
  return null;
}

/**
 * Cierra una partida: el cliente envía solo los movimientos y el servidor
 * recalcula la puntuación repitiendo la partida desde la semilla.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/runs/[id]/finish">) {
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const moves = (body as { moves?: unknown } | null)?.moves;
  if (typeof moves !== "string" || moves.length > MAX_MOVES_LENGTH) {
    return apiJson({ error: "Movimientos no válidos" }, { status: 400 });
  }

  const { supabase, userId } = await createClientForRequest(request);
  if (!userId) {
    return apiJson({ error: "Hay que iniciar sesión" }, { status: 401 });
  }

  // Con el cliente del usuario: RLS garantiza que la partida es suya.
  const { data: run, error: runError } = await supabase
    .from("game_runs")
    .select("id, game, seed, status, started_at")
    .eq("id", id)
    .maybeSingle();

  if (runError) {
    console.error("finish: error leyendo la partida", runError);
    return serverError();
  }
  if (!run) {
    return apiJson({ error: "Partida no encontrada" }, { status: 404 });
  }
  if (run.status !== "playing") {
    return alreadyClosed();
  }

  const elapsedMs = Date.now() - new Date(run.started_at).getTime();
  const result = verify(run.game, run.seed, moves, elapsedMs);
  if (!result) {
    return apiJson({ error: "Juego desconocido" }, { status: 404 });
  }
  const admin = createAdminClient();

  const { error } = result.valid
    ? await admin.rpc("finish_run", { run_id: run.id, moves, score: result.score, max_tile: result.detail })
    : await admin.rpc("reject_run", { run_id: run.id, reason: result.reason });

  if (error?.code === RUN_NOT_PLAYING) {
    // Dos envíos simultáneos, o se empezó otra partida entre medias.
    return alreadyClosed();
  }
  if (error) {
    console.error("finish: error cerrando la partida", error);
    return serverError();
  }

  return result.valid
    ? Response.json({ status: "finished", score: result.score })
    : Response.json({ status: "rejected" }, { status: 422 });
}
