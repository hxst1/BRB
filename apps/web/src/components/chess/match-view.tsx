"use client";

import { MatchSounds, resultFor } from "@/components/match-sounds";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { replay, type ChessState, type Mark } from "@repo/games/chess";
import type { Mood } from "@repo/avatars";
import type { Match } from "@repo/db";
import { challenge, fetchMatch, markOf, type MatchWithPlayers, type Player } from "@/components/tictactoe/data";
import { PlayerBadge, ResignButton } from "@/components/tictactoe/match-view";
import type { Messages } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/client";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import { ChessBoard, pieceSrc } from "./board";
import { MatchNotFound } from "@/components/match-not-found";
import { PIECE_MARK_COLORS } from "@/lib/piece-colors";

const PATH = "/ajedrez";

/** Partida de ajedrez por turnos contra un amigo. X juega con rojas. */
export function ChessMatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  const router = useRouter();
  const m = useMessages();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  /** Jugada enviada y aún sin confirmar: se ve ya en el tablero. */
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Carga inicial y cambios en tiempo real (jugadas del rival, aceptar, rendirse…).
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchMatch(matchId).then((data) => {
      if (!cancelled) setMatch(data);
    });
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`match:${matchId}`))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (payload) => {
          setMatch((current) => (current ? { ...current, ...(payload.new as Match) } : current));
          setPending(null);
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          fetchMatch(matchId).then((data) => {
            if (!cancelled) setMatch(data);
          });
        }),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [matchId]);

  const act = useCallback(
    async (action: () => PromiseLike<{ error: unknown }>) => {
      setBusy(true);
      setError(null);
      const { error: actionError } = await action();
      setBusy(false);
      if (actionError) setError(m.match.actionError);
      else setMatch(await fetchMatch(matchId));
    },
    [matchId, m],
  );

  if (match === undefined) return <div className="aspect-square w-full max-w-lg animate-pulse rounded-[18px] bg-line/40" />;
  if (match === null || match.game !== "chess") {
    return <MatchNotFound path={PATH} />;
  }

  const me = markOf(match, viewerId);
  const rival: Mark = me === "x" ? "o" : "x";
  const players: Record<Mark, Player> = { x: match.x, o: match.o };
  const saved = replay(match.moves) ?? replay([])!;
  const state: ChessState = (pending !== null && replay([...match.moves, pending])) || saved;
  const myTurn = match.status === "active" && state.turn === me && pending === null;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;
  const winner = match.status === "finished" ? (match.winner as Mark | null) : null;
  const moodOf = (mark: Mark): Mood => (match.status !== "finished" || !winner ? "neutral" : winner === mark ? "happy" : "sad");

  async function move(code: number) {
    setError(null);
    setPending(code);
    const response = await fetch(`/api/matches/${matchId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ move: code }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? m.match.moveError);
    }
    // La jugada llega también por Realtime; esto cubre el caso en que no esté conectado.
    setMatch(await fetchMatch(matchId));
    setPending(null);
  }

  async function rematch() {
    setBusy(true);
    const id = await challenge(players[rival].id, "chess");
    setBusy(false);
    if (id) router.push(`${PATH}/${id}`);
    else setError(m.match.rematchError);
  }

  const side = (mark: Mark) => (
    <span className="mt-1 flex items-center gap-1 text-xs text-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pieceSrc(mark, "k")} alt="" className="size-4" />
      {mark === "x" ? m.chess.red : m.chess.blue}
    </span>
  );

  return (
    <div className="flex w-full max-w-lg flex-col gap-5" style={PIECE_MARK_COLORS}>
      <MatchSounds progress={match.moves.length} myTurn={myTurn} result={resultFor(match, me)} />
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <PlayerBadge player={players[me]} mark={me} label={m.match.you} active={myTurn} mood={moodOf(me)} detail={side(me)} />
        <span className="hidden shrink-0 text-sm text-muted sm:inline">{m.match.versus}</span>
        <PlayerBadge
          player={players[rival]}
          mark={rival}
          active={match.status === "active" && state.turn === rival}
          mood={moodOf(rival)}
          alignEnd
          detail={side(rival)}
        />
      </div>

      <p aria-live="polite" className="display text-center text-3xl font-bold text-balance">
        {statusText(m, match, me, state, players[rival].username)}
      </p>

      <ChessBoard state={state} me={me} canPlay={myTurn && !busy} onMove={(code) => void move(code)} />

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
              {m.match.accept}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => createClient().rpc("respond_match", { match_id: match.id, accept: false }))}
              className="text-sm text-muted hover:text-ink"
            >
              {m.now.decline}
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
            {m.match.withdraw}
          </button>
        )}
        {match.status === "active" && <ResignButton disabled={busy} onConfirm={() => void act(() => createClient().rpc("resign_match", { match_id: match.id }))} />}
        {(match.status === "finished" || match.status === "declined" || match.status === "cancelled") && (
          <button type="button" disabled={busy} onClick={() => void rematch()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {match.status === "finished" ? m.match.rematch : m.match.challengeAgain}
          </button>
        )}
        <Link href={PATH} className="text-sm text-muted hover:text-ink">
          {m.match.all}
        </Link>
      </div>
    </div>
  );
}

function statusText(m: Messages, match: Match, me: Mark, state: ChessState, rivalName: string): string {
  switch (match.status) {
    case "pending":
      return match.created_by === (me === "x" ? match.player_x : match.player_o) ? m.match.waitingAccept(rivalName) : m.match.challengesYou(rivalName);
    case "declined":
      return m.match.declined(rivalName);
    case "cancelled":
      return m.match.withdrawn;
    case "active":
      if (state.turn === me) return state.check ? m.chess.yourTurnCheck : m.match.yourTurn;
      return m.match.theirTurn(rivalName);
    case "finished":
      if (match.end_reason === "resign") return match.winner === me ? m.match.theyResigned(rivalName) : m.match.youResigned;
      if (match.end_reason === "checkmate") return match.winner === me ? m.chess.youMated : m.chess.theyMated(rivalName);
      return state.ending && state.ending !== "checkmate" ? m.chess.draws[state.ending] : m.match.draw;
    default:
      return "";
  }
}
