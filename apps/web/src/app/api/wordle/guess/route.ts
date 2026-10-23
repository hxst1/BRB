import { MAX_GUESSES, scoreGuess } from "@repo/games/wordle";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientForRequest } from "@/lib/supabase/server";
import { parseGuess, wordleToday } from "@/lib/wordle/server";
import { apiJson } from "@/lib/i18n/api";

/**
 * Puntúa un intento del Wordle. La palabra se queda en el servidor: solo se
 * devuelven los colores (y la palabra, al fallar los 6 intentos).
 */
export async function POST(request: Request) {
  const { userId } = await createClientForRequest(request);
  if (!userId) return apiJson({ error: "Hay que iniciar sesión" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { day?: unknown; guess?: unknown } | null;
  if (typeof body?.guess !== "string" || typeof body.day !== "string") {
    return apiJson({ error: "Intento no válido" }, { status: 400 });
  }

  const guess = parseGuess(body.guess);
  if (!guess) return apiJson({ error: "No está en la lista de palabras" }, { status: 422 });

  const today = await wordleToday();
  if (body.day !== today.day) {
    return apiJson({ error: "Ha cambiado el día: recarga para jugar la palabra nueva", code: "day_changed" }, { status: 409 });
  }

  const pattern = scoreGuess(guess, today.word);
  // Devuelve una sola fila (la partida), no una lista.
  const { data: game, error } = await createAdminClient().rpc("wordle_add_guess", {
    player: userId,
    game_day: today.day,
    guess,
    pattern,
  });

  if (error?.hint === "finished") return apiJson({ error: "Ya has terminado la palabra de hoy" }, { status: 409 });
  if (error || !game) {
    console.error("wordle: error guardando el intento", error);
    return apiJson({ error: "Error interno" }, { status: 500 });
  }

  const finished = game.finished_at !== null;
  return Response.json({
    guess,
    pattern,
    solved: game.solved,
    finished,
    answer: finished && !game.solved ? today.word : null,
    attempts: game.guesses.length,
    maxGuesses: MAX_GUESSES,
  });
}
