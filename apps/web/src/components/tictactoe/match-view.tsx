"use client";

import { MatchSounds, resultFor } from "@/components/match-sounds";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { replay as replayConnect4 } from "@repo/games/connect4";
import { replay, type Mark } from "@repo/games/tictactoe";
import type { Mood } from "@repo/avatars";
import type { Match } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { Connect4Board } from "@/components/connect4/board";
import { MATCH_GAMES } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { TicTacToeBoard } from "./board";
import { challenge, fetchMatch, markOf, type MatchWithPlayers, type Player } from "./data";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import type { Messages } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/client";
import { MatchNotFound } from "@/components/match-not-found";

export const MARK_COLOR: Record<Mark, string> = { x: "var(--mark-x)", o: "var(--mark-o)" };

/** Partida por turnos contra un amigo: 3 en raya o 4 en raya (cambian el tablero y la lógica). */
export function MatchView({
  matchId,
  viewerId,
  game = "tictactoe",
}: {
  matchId: string;
  viewerId: string;
  game?: "tictactoe" | "connect4";
}) {
  const router = useRouter();
  const m = useMessages();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  // Jugada enviada y aún sin confirmar: casilla (3 en raya) o columna (4 en raya).
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const path = MATCH_GAMES[game].path;
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
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
          (payload) => {
            const updated = payload.new as Match;
            setMatch((current) => (current ? { ...current, ...updated } : current));
            setPendingCell(null);
          },
        )
        // Lo que cambie mientras se conecta no llega por el canal: al quedar conectado, se recarga.
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

  if (match === undefined) return <div className={`${game === "connect4" ? "c4-board aspect-[7/6]" : "ttt-board"} w-full max-w-md animate-pulse`} />;
  if (match === null || match.game !== game) {
    return <MatchNotFound path={path} />;
  }

  const me = markOf(match, viewerId);
  const rival: Mark = me === "x" ? "o" : "x";
  const moves = pendingCell === null ? match.moves : [...match.moves, pendingCell];
  const replayGame = (list: number[]) => (game === "connect4" ? replayConnect4(list) : replay(list));
  const state = replayGame(moves) ?? replayGame(match.moves)!;
  const myTurn = match.status === "active" && state.turn === me && pendingCell === null;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;
  const players: Record<Mark, Player> = { x: match.x, o: match.o };

  async function playCell(cell: number) {
    setError(null);
    setPendingCell(cell);
    const response = await fetch(`/api/matches/${matchId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(game === "connect4" ? { column: cell } : { cell }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? m.match.moveError);
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
    const id = await challenge(players[rival].id, game);
    setBusy(false);
    if (id) router.push(`${path}/${id}`);
    else setError(m.match.rematchError);
  }

  const winnerMark = match.status === "finished" ? (match.winner as Mark | null) : null;
  const moodOf = (mark: Mark): Mood =>
    match.status !== "finished" || !winnerMark ? "neutral" : winnerMark === mark ? "happy" : "sad";

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <MatchSounds progress={match.moves.length} myTurn={myTurn} result={resultFor(match, me)} />
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <PlayerBadge
          player={players[me]}
          mark={me}
          label={m.match.you}
          active={state.turn === me && match.status === "active"}
          mood={moodOf(me)}
          detail={game === "connect4" ? <Disc mark={me} /> : undefined}
        />
        <span className="hidden shrink-0 text-sm text-muted sm:inline">{m.match.versus}</span>
        <PlayerBadge
          player={players[rival]}
          mark={rival}
          active={state.turn === rival && match.status === "active"}
          mood={moodOf(rival)}
          alignEnd
          detail={game === "connect4" ? <Disc mark={rival} /> : undefined}
        />
      </div>

      <p aria-live="polite" className="display text-center text-3xl font-bold">
        {statusText(m, match, me, state.turn, players[rival].username)}
      </p>

      <div className="w-full" style={{ "--win-color": winnerMark ? MARK_COLOR[winnerMark] : undefined } as CSSProperties}>
        {"last" in state ? (
          <Connect4Board
            board={state.board}
            line={state.line}
            last={state.last}
            me={me}
            canPlay={myTurn && !busy}
            onPlay={(column) => void playCell(column)}
          />
        ) : (
          <TicTacToeBoard board={state.board} line={state.line} canPlay={myTurn && !busy} onPlay={(cell) => void playCell(cell)} />
        )}
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
        <Link href={path} className="text-sm text-muted hover:text-ink">
          {m.match.all}
        </Link>
      </div>
    </div>
  );
}

/** Ficha del color de cada jugador en el 4 en raya. */
function Disc({ mark }: { mark: Mark }) {
  const m = useMessages();
  return (
    <span
      role="img"
      aria-label={mark === "x" ? m.match.redPieces : m.match.bluePieces}
      className="mt-1 size-4 rounded-full"
      style={{ background: MARK_COLOR[mark] }}
    />
  );
}

function statusText(m: Messages, match: Match, me: Mark, turn: Mark | null, rivalName: string): string {
  switch (match.status) {
    case "pending":
      return match.created_by === (me === "x" ? match.player_x : match.player_o)
        ? m.match.waitingAccept(rivalName)
        : m.match.challengesYou(rivalName);
    case "declined":
      return m.match.declined(rivalName);
    case "cancelled":
      return m.match.withdrawn;
    case "active":
      return turn === me ? m.match.yourTurn : m.match.theirTurn(rivalName);
    case "finished":
      if (!match.winner) return m.match.draw;
      if (match.end_reason === "resign") return match.winner === me ? m.match.theyResigned(rivalName) : m.match.youResigned;
      return match.winner === me ? m.match.youWon : m.match.theyWon(rivalName);
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
  const m = useMessages();
  return (
    // min-w-0: con un nombre largo, el nombre se corta en vez de empujar al rival fuera de la pantalla.
    <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${alignEnd ? "flex-row-reverse text-right" : ""}`}>
      <span
        className={`grid size-13 shrink-0 place-items-center rounded-2xl bg-surface transition-shadow sm:size-16 [&>.monster]:!size-11 sm:[&>.monster]:!size-13 ${
          active ? "shadow-lift" : "shadow-soft"
        }`}
        style={active ? { boxShadow: `0 0 0 3px ${MARK_COLOR[mark]}` } : undefined}
      >
        <Avatar seed={player.avatar_seed} parts={player.avatar_parts} size={52} mood={mood} />
      </span>
      {/* Solo se recorta el nombre: "Tú" y el detalle (que puede partirse en dos líneas) se ven siempre. */}
      <span className={`flex flex-col ${alignEnd ? "items-end" : "items-start"} ${label ? "whitespace-nowrap" : "min-w-0"}`}>
        <span className="max-w-full truncate font-semibold" title={label ? undefined : player.username}>
          {label ?? player.username}
        </span>
        {detail ?? (
          <span className="text-lg leading-none font-bold" style={{ color: MARK_COLOR[mark] }} aria-label={m.match.playsWith(mark.toUpperCase())}>
            {mark === "x" ? "×" : "○"}
          </span>
        )}
      </span>
    </div>
  );
}

export function ResignButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  const m = useMessages();
  if (!asking) {
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className="text-sm text-muted hover:text-ink">
        {m.match.resign}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      {m.match.sure}
      <button type="button" onClick={onConfirm} className="font-medium text-danger">
        {m.match.yesResign}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="text-muted hover:text-ink">
        {m.run.no}
      </button>
    </span>
  );
}
