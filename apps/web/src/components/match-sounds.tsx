"use client";

import { useEffect, useRef } from "react";
import { reportGameFinished } from "@/lib/game-rating";
import { playSound } from "@/lib/sound";

type Result = "win" | "lose" | "draw" | null;

/**
 * Sonidos de las partidas por turnos: un toque cuando mueves, "te toca"
 * cuando mueve tu rival, y el final. Va dentro de la partida (no devuelve
 * nada) y calla al cargarla: solo suenan los cambios.
 */
export function MatchSounds({ game, progress, myTurn, result }: { game: string; progress: number; myTurn: boolean; result: Result }) {
  const before = useRef<{ progress: number; result: Result } | null>(null);
  useEffect(() => {
    const previous = before.current;
    before.current = { progress, result };
    if (!previous) return;
    if (result && !previous.result) {
      reportGameFinished(game);
      return playSound(result === "win" ? "win" : result === "lose" ? "lose" : "pop");
    }
    if (progress > previous.progress) playSound(myTurn ? "turn" : "tap");
  }, [game, progress, myTurn, result]);
  return null;
}

/** El resultado de una partida terminada, visto por `me`. */
export function resultFor(match: { status: string; winner: string | null }, me: string): Result {
  if (match.status !== "finished") return null;
  return !match.winner ? "draw" : match.winner === me ? "win" : "lose";
}

/**
 * Sonidos de las partidas en directo (Pong, Tron): "¡ya!" al empezar, un
 * punto tuyo o del rival, y el final.
 */
export function LiveSounds({ game, mine, theirs, playing, done }: { game: string; mine: number; theirs: number; playing: boolean; done: boolean }) {
  const before = useRef<{ mine: number; theirs: number; playing: boolean; done: boolean } | null>(null);
  useEffect(() => {
    const previous = before.current;
    before.current = { mine, theirs, playing, done };
    if (!previous) return;
    if (done && !previous.done) {
      reportGameFinished(game);
      return playSound(mine > theirs ? "win" : "lose");
    }
    if (playing && !previous.playing) return playSound("go");
    if (mine > previous.mine) playSound("pop");
    else if (theirs > previous.theirs) playSound("tap", { pitch: 0.75 });
  }, [game, mine, theirs, playing, done]);
  return null;
}
