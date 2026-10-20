"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Mood } from "@repo/avatars";
import { CHOICE_NAMES, CHOICES, replay, WINS_NEEDED, type Choice, type Mark, type Variant } from "@repo/games/rps";
import type { Match } from "@repo/db";
import { MARK_COLOR, PlayerBadge, ResignButton } from "@/components/tictactoe/match-view";
import { challenge, fetchMatch, markOf, type MatchWithPlayers } from "@/components/tictactoe/data";
import { matchGame, matchHref } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";

export const CHOICE_EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
  lizard: "🦎",
  spock: "🖖",
};

export function RpsMatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  const router = useRouter();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  /** Lo que he elegido en la ronda en curso (solo yo puedo verlo). */
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMyChoice = useCallback(
    async (current: Match | null) => {
      if (!current || current.status !== "active") return setMyChoice(null);
      const { data } = await createClient()
        .from("match_choices")
        .select("choice")
        .eq("match_id", current.id)
        .eq("player_id", viewerId)
        .eq("round", current.moves.length / 2)
        .maybeSingle();
      setMyChoice(data?.choice ?? null);
    },
    [viewerId],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchMatch(matchId).then(async (data) => {
      if (cancelled) return;
      setMatch(data);
      await loadMyChoice(data);
    });

    // Al resolverse una ronda (o aceptar, rendirse…) llega la partida actualizada.
    const channel = supabase
      .channel(`rps:${matchId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (payload) => {
        const updated = payload.new as Match;
        setMatch((current) => (current ? { ...current, ...updated } : current));
        void loadMyChoice(updated);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId, loadMyChoice]);

  const act = useCallback(
    async (action: () => PromiseLike<{ error: unknown }>) => {
      setBusy(true);
      setError(null);
      const { error: actionError } = await action();
      setBusy(false);
      if (actionError) setError("No se ha podido completar. Recarga la página e inténtalo otra vez.");
      else setMatch(await fetchMatch(matchId));
    },
    [matchId],
  );

  if (match === undefined) return <div className="h-80 w-full max-w-md animate-pulse rounded-3xl bg-line/40" />;
  if (match === null) {
    return (
      <p className="text-muted">
        No encontramos esta partida.{" "}
        <Link href="/piedra-papel-tijera" className="font-medium text-ink underline underline-offset-4">
          Ver tus partidas
        </Link>
      </p>
    );
  }

  const variant = match.game as Variant;
  const state = replay(variant, match.moves);
  const me = markOf(match, viewerId);
  const rival: Mark = me === "x" ? "o" : "x";
  const players = { x: match.x, o: match.o };
  const rivalName = players[rival].username;
  const lastRound = state?.rounds.at(-1) ?? null;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;
  const canChoose = match.status === "active" && myChoice === null && !busy;

  async function choose(index: number) {
    setError(null);
    setBusy(true);
    setMyChoice(index);
    const response = await fetch(`/api/matches/${matchId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ choice: index }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "No se ha podido enviar tu elección.");
    }
    // Si era la segunda elección, la ronda ya está resuelta: recargar por si Realtime tarda.
    const updated = await fetchMatch(matchId);
    setMatch(updated);
    await loadMyChoice(updated);
  }

  async function rematch() {
    setBusy(true);
    const id = await challenge(players[rival].id, match!.game as "rps" | "rpsls");
    setBusy(false);
    if (id) router.push(matchHref({ id, game: match!.game }));
    else setError("No se ha podido crear la revancha.");
  }

  const moodOf = (mark: Mark): Mood => {
    if (match.status === "finished") return !match.winner ? "neutral" : match.winner === mark ? "happy" : "sad";
    if (!lastRound?.winner) return "neutral";
    return lastRound.winner === mark ? "happy" : "sad";
  };

  const score = (mark: Mark) => (
    <span className="tabular text-lg leading-none font-bold" style={{ color: MARK_COLOR[mark] }}>
      {state?.score[mark] ?? 0} / {WINS_NEEDED}
    </span>
  );

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <p className="text-center text-sm text-muted">{matchGame(match.game).name}</p>

      <div className="flex items-center justify-between gap-4">
        <PlayerBadge player={players[me]} mark={me} label="Tú" active={canChoose} mood={moodOf(me)} detail={score(me)} />
        <span className="text-sm text-muted">contra</span>
        <PlayerBadge player={players[rival]} mark={rival} active={false} mood={moodOf(rival)} detail={score(rival)} alignEnd />
      </div>

      <p aria-live="polite" className="display text-center text-3xl font-bold text-balance">
        {statusText(match, me, myChoice, rivalName, variant)}
      </p>

      {lastRound && (
        <section aria-label={`Ronda ${state!.rounds.length}`} className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-5 shadow-soft">
          <p className="text-xs text-muted">Ronda {state!.rounds.length}</p>
          <div className="flex items-center gap-6">
            <RevealedChoice choice={lastRound[me]} label="Tú" key={`me-${state!.rounds.length}`} />
            <span className="text-sm text-muted">vs</span>
            <RevealedChoice choice={lastRound[rival]} label={rivalName} key={`rival-${state!.rounds.length}`} />
          </div>
          <p className="text-center font-medium">
            {lastRound.verdict ?? "Empate: se repite la ronda"}
            {lastRound.winner && (lastRound.winner === me ? ". Ronda para ti." : `. Ronda para ${rivalName}.`)}
          </p>
        </section>
      )}

      {match.status === "active" && (
        <div role="group" aria-label="Elige" className={`grid gap-2 ${variant === "rps" ? "grid-cols-3" : "grid-cols-5"}`}>
          {CHOICES[variant].map((choice, index) => {
            const selected = myChoice === index;
            return (
              <button
                key={choice}
                type="button"
                disabled={!canChoose}
                aria-pressed={selected}
                onClick={() => void choose(index)}
                className={`flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 transition-[transform,box-shadow] ${
                  selected ? "ring-2 ring-ink" : canChoose ? "shadow-soft hover:-translate-y-0.5 hover:shadow-lift" : "opacity-40"
                }`}
              >
                <span aria-hidden className={variant === "rps" ? "text-4xl" : "text-3xl"}>
                  {CHOICE_EMOJI[choice]}
                </span>
                <span className="text-xs font-medium">{CHOICE_NAMES[choice]}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {invitedMe && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => createClient().rpc("respond_match", { match_id: match.id, accept: true }))}
              className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
            >
              Aceptar el reto
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => createClient().rpc("respond_match", { match_id: match.id, accept: false }))}
              className="text-sm text-muted hover:text-ink"
            >
              Rechazar
            </button>
          </>
        )}
        {match.status === "pending" && !invitedMe && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => createClient().rpc("cancel_match", { match_id: match.id }))}
            className="text-sm text-muted hover:text-ink"
          >
            Retirar el reto
          </button>
        )}
        {match.status === "active" && (
          <ResignButton disabled={busy} onConfirm={() => void act(() => createClient().rpc("resign_match", { match_id: match.id }))} />
        )}
        {(match.status === "finished" || match.status === "declined" || match.status === "cancelled") && (
          <button type="button" disabled={busy} onClick={() => void rematch()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {match.status === "finished" ? "Revancha" : "Retar otra vez"}
          </button>
        )}
        <Link href="/piedra-papel-tijera" className="text-sm text-muted hover:text-ink">
          Todas tus partidas
        </Link>
      </div>
    </div>
  );
}

/** Elección revelada, con una pequeña animación de aparición. */
function RevealedChoice({ choice, label }: { choice: Choice; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span aria-hidden className="rps-reveal text-5xl">
        {CHOICE_EMOJI[choice]}
      </span>
      <span className="text-xs text-muted">
        {label}: {CHOICE_NAMES[choice]}
      </span>
    </div>
  );
}

function statusText(match: Match, me: Mark, myChoice: number | null, rivalName: string, variant: Variant): string {
  switch (match.status) {
    case "pending":
      return match.created_by === (me === "x" ? match.player_x : match.player_o)
        ? `Esperando a que ${rivalName} acepte`
        : `${rivalName} te reta`;
    case "declined":
      return `${rivalName} ha rechazado el reto`;
    case "cancelled":
      return "Reto retirado";
    case "active":
      return myChoice === null
        ? "Elige en secreto"
        : `Has elegido ${CHOICE_NAMES[CHOICES[variant][myChoice]!].toLowerCase()}. Esperando a ${rivalName}…`;
    case "finished":
      if (!match.winner) return "Empate";
      if (match.end_reason === "resign") return match.winner === me ? `${rivalName} se ha rendido` : "Te has rendido";
      return match.winner === me ? "¡Has ganado!" : `Gana ${rivalName}`;
    default:
      return "";
  }
}
