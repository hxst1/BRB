"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { replay, type Mark } from "@repo/games/tictactoe";
import type { Mood } from "@repo/avatars";
import type { Match } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { TicTacToeBoard } from "./board";
import { challenge, fetchMatch, markOf, type MatchWithPlayers, type Player } from "./data";

export const MARK_COLOR: Record<Mark, string> = { x: "var(--mark-x)", o: "var(--mark-o)" };

export function MatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  const router = useRouter();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Carga inicial y cambios en tiempo real (jugadas del rival, aceptar, rendirse…).
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchMatch(matchId).then((data) => {
      if (!cancelled) setMatch(data);
    });

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as Match;
          setMatch((current) => (current ? { ...current, ...updated } : current));
          setPendingCell(null);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

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

  if (match === undefined) return <div className="ttt-board max-w-md animate-pulse" />;
  if (match === null) {
    return (
      <p className="text-muted">
        No encontramos esta partida.{" "}
        <Link href="/3-en-raya" className="font-medium text-ink underline underline-offset-4">
          Ver tus partidas
        </Link>
      </p>
    );
  }

  const me = markOf(match, viewerId);
  const rival: Mark = me === "x" ? "o" : "x";
  const moves = pendingCell === null ? match.moves : [...match.moves, pendingCell];
  const state = replay(moves) ?? replay(match.moves)!;
  const myTurn = match.status === "active" && state.turn === me && pendingCell === null;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;
  const players: Record<Mark, Player> = { x: match.x, o: match.o };

  async function playCell(cell: number) {
    setError(null);
    setPendingCell(cell);
    const response = await fetch(`/api/matches/${matchId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cell }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "No se ha podido hacer la jugada.");
      setPendingCell(null);
      setMatch(await fetchMatch(matchId));
      return;
    }
    // La jugada llega también por Realtime; esto cubre el caso en que no esté conectado.
    const updated = await fetchMatch(matchId);
    setMatch(updated);
    setPendingCell(null);
  }

  async function rematch() {
    setBusy(true);
    const id = await challenge(players[rival].id);
    setBusy(false);
    if (id) router.push(`/3-en-raya/${id}`);
    else setError("No se ha podido crear la revancha.");
  }

  const winnerMark = match.status === "finished" ? (match.winner as Mark | null) : null;
  const moodOf = (mark: Mark): Mood =>
    match.status !== "finished" || !winnerMark ? "neutral" : winnerMark === mark ? "happy" : "sad";

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <PlayerBadge player={players[me]} mark={me} label="Tú" active={state.turn === me && match.status === "active"} mood={moodOf(me)} />
        <span className="text-sm text-muted">contra</span>
        <PlayerBadge player={players[rival]} mark={rival} active={state.turn === rival && match.status === "active"} mood={moodOf(rival)} alignEnd />
      </div>

      <p aria-live="polite" className="display text-center text-3xl font-bold">
        {statusText(match, me, state.turn, players[rival].username)}
      </p>

      <div className="w-full" style={{ "--win-color": winnerMark ? MARK_COLOR[winnerMark] : undefined } as CSSProperties}>
        <TicTacToeBoard board={state.board} line={state.line} canPlay={myTurn && !busy} onPlay={(cell) => void playCell(cell)} />
      </div>

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
        {match.status === "active" && <ResignButton disabled={busy} onConfirm={() => void act(() => createClient().rpc("resign_match", { match_id: match.id }))} />}
        {(match.status === "finished" || match.status === "declined" || match.status === "cancelled") && (
          <button type="button" disabled={busy} onClick={() => void rematch()} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {match.status === "finished" ? "Revancha" : "Retar otra vez"}
          </button>
        )}
        <Link href="/3-en-raya" className="text-sm text-muted hover:text-ink">
          Todas tus partidas
        </Link>
      </div>
    </div>
  );
}

function statusText(match: Match, me: Mark, turn: Mark | null, rivalName: string): string {
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
      return turn === me ? "Te toca" : `Le toca a ${rivalName}`;
    case "finished":
      if (!match.winner) return "Empate";
      if (match.end_reason === "resign") return match.winner === me ? `${rivalName} se ha rendido` : "Te has rendido";
      return match.winner === me ? "¡Has ganado!" : `Gana ${rivalName}`;
    default:
      return "";
  }
}

export function PlayerBadge({
  player,
  mark,
  label,
  active,
  mood,
  alignEnd = false,
  detail,
}: {
  player: Player;
  mark: Mark;
  label?: string;
  active: boolean;
  mood: Mood;
  alignEnd?: boolean;
  /** Sustituye al símbolo × / ○ (p. ej. el marcador en piedra, papel o tijera). */
  detail?: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 ${alignEnd ? "flex-row-reverse text-right" : ""}`}>
      <span
        className={`grid size-16 place-items-center rounded-2xl bg-surface transition-shadow ${active ? "shadow-lift" : "shadow-soft"}`}
        style={active ? { boxShadow: `0 0 0 3px ${MARK_COLOR[mark]}` } : undefined}
      >
        <Avatar seed={player.avatar_seed} parts={player.avatar_parts} size={52} mood={mood} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{label ?? player.username}</span>
        {detail ?? (
          <span className="text-lg leading-none font-bold" style={{ color: MARK_COLOR[mark] }} aria-label={`Juega con ${mark.toUpperCase()}`}>
            {mark === "x" ? "×" : "○"}
          </span>
        )}
      </span>
    </div>
  );
}

export function ResignButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className="text-sm text-muted hover:text-ink">
        Rendirse
      </button>
    );
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      ¿Seguro?
      <button type="button" onClick={onConfirm} className="font-medium text-danger">
        Sí, me rindo
      </button>
      <button type="button" onClick={() => setAsking(false)} className="text-muted hover:text-ink">
        No
      </button>
    </span>
  );
}
