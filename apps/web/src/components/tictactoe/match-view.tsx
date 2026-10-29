"use client";

import { MatchSounds, resultFor } from "@/components/match-sounds";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { play as playConnect4, replay as replayConnect4, type Connect4State } from "@repo/games/connect4";
import { play as playDots, replay as replayDots, type DotsState } from "@repo/games/dots";
import { play as playReversi, replay as replayReversi, type ReversiState } from "@repo/games/reversi";
import { play, replay, type Mark, type TicTacToeState } from "@repo/games/tictactoe";
import type { Mood } from "@repo/avatars";
import type { Match } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { Connect4Board } from "@/components/connect4/board";
import { DotsBoard } from "@/components/dots/board";
import { ReversiBoard } from "@/components/reversi/board";
import { MATCH_GAMES } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { TicTacToeBoard } from "./board";
import { MatchSkeleton } from "./match-skeleton";
import { challenge, fetchMatch, markOf, type MatchWithPlayers, type Player } from "./data";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import type { Messages } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/client";
import { MatchNotFound } from "@/components/match-not-found";

export const MARK_COLOR: Record<Mark, string> = { x: "var(--mark-x)", o: "var(--mark-o)" };

export type BoardGame = "tictactoe" | "connect4" | "reversi" | "dots";

type Loaded =
  | { game: "tictactoe"; state: TicTacToeState }
  | { game: "connect4"; state: Connect4State }
  | { game: "reversi"; state: ReversiState }
  | { game: "dots"; state: DotsState };

/**
 * El estado de la partida, con la jugada enviada (`pending`) ya hecha para que
 * se vea al momento. Se aplica con `play` y no repitiendo la lista: en el
 * Reversi y en puntos y cajas una jugada puede añadir un turno perdido.
 */
function load(game: BoardGame, moves: number[], pending: number | null, me: Mark): Loaded {
  switch (game) {
    case "connect4": {
      const saved = replayConnect4(moves) ?? replayConnect4([])!;
      const next = pending === null ? null : playConnect4(saved, me, pending);
      return { game, state: next?.ok ? next.state : saved };
    }
    case "reversi": {
      const saved = replayReversi(moves) ?? replayReversi([])!;
      const next = pending === null ? null : playReversi(saved, me, pending);
      return { game, state: next?.ok ? next.state : saved };
    }
    case "dots": {
      const saved = replayDots(moves) ?? replayDots([])!;
      const next = pending === null ? null : playDots(saved, me, pending);
      return { game, state: next?.ok ? next.state : saved };
    }
    default: {
      const saved = replay(moves) ?? replay([])!;
      const next = pending === null ? null : play(saved, me, pending);
      return { game: "tictactoe", state: next?.ok ? next.state : saved };
    }
  }
}

/** Lo que se manda al servidor en cada jugada. */
const MOVE_FIELD: Record<BoardGame, string> = { tictactoe: "cell", connect4: "column", reversi: "cell", dots: "edge" };

/** Partida por turnos contra un amigo: 3 en raya, 4 en raya, Reversi o puntos y cajas (cambian el tablero y la lógica). */
export function MatchView({
  matchId,
  viewerId,
  game = "tictactoe",
}: {
  matchId: string;
  viewerId: string;
  game?: BoardGame;
}) {
  const router = useRouter();
  const m = useMessages();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  // Jugada enviada y aún sin confirmar: casilla, columna (4 en raya) o raya (puntos y cajas).
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

  if (match === undefined) return <MatchSkeleton game={game} />;
  if (match === null || match.game !== game) {
    return <MatchNotFound path={path} />;
  }

  const me = markOf(match, viewerId);
  const rival: Mark = me === "x" ? "o" : "x";
  const loaded = load(game, match.moves, pendingCell, me);
  const state = loaded.state;
  const myTurn = match.status === "active" && state.turn === me && pendingCell === null;
  const passNote = extraTurn(loaded, me, match[rival].username, m);
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;
  const players: Record<Mark, Player> = { x: match.x, o: match.o };

  async function playCell(cell: number) {
    setError(null);
    setPendingCell(cell);
    const response = await fetch(`/api/matches/${matchId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [MOVE_FIELD[game]]: cell }),
    }).catch(() => null); // Sin conexión: se avisa y se puede volver a tocar.
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => ({})) : {};
      setError(body.error ?? (response ? m.match.moveError : m.match.offline));
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
    <div className="reveal-in flex w-full max-w-md flex-col gap-6">
      <MatchSounds game={game} progress={match.moves.length} myTurn={myTurn} result={resultFor(match, me)} />
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <PlayerBadge
          player={players[me]}
          mark={me}
          label={m.match.you}
          active={state.turn === me && match.status === "active"}
          mood={moodOf(me)}
          detail={badgeDetail(loaded, me, m)}
        />
        <span className="hidden shrink-0 text-sm text-muted sm:inline">{m.match.versus}</span>
        <PlayerBadge
          player={players[rival]}
          mark={rival}
          active={state.turn === rival && match.status === "active"}
          mood={moodOf(rival)}
          alignEnd
          detail={badgeDetail(loaded, rival, m)}
        />
      </div>

      <div aria-live="polite" className="text-center">
        <p className="display text-3xl font-bold">{statusText(m, match, me, state.turn, players[rival].username)}</p>
        {match.status === "active" && passNote && <p className="mt-1 text-sm text-muted">{passNote}</p>}
      </div>

      <div className="w-full" style={{ "--win-color": winnerMark ? MARK_COLOR[winnerMark] : undefined } as CSSProperties}>
        {loaded.game === "connect4" ? (
          <Connect4Board
            board={loaded.state.board}
            line={loaded.state.line}
            last={loaded.state.last}
            me={me}
            canPlay={myTurn && !busy}
            onPlay={(column) => void playCell(column)}
          />
        ) : loaded.game === "reversi" ? (
          <ReversiBoard
            board={loaded.state.board}
            last={loaded.state.last}
            flipped={loaded.state.flipped}
            me={me}
            canPlay={myTurn && !busy}
            onPlay={(cell) => void playCell(cell)}
          />
        ) : loaded.game === "dots" ? (
          <DotsBoard
            edges={loaded.state.edges}
            boxes={loaded.state.boxes}
            last={loaded.state.last}
            closed={loaded.state.closed}
            me={me}
            canPlay={myTurn && !busy}
            onPlay={(edge) => void playCell(edge)}
          />
        ) : (
          <TicTacToeBoard board={loaded.state.board} line={loaded.state.line} canPlay={myTurn && !busy} onPlay={(cell) => void playCell(cell)} />
        )}
      </div>

      {myTurn && (loaded.game === "reversi" || loaded.game === "dots") && match.moves.length < 2 && (
        <p className="-mt-3 text-center text-sm text-muted">{loaded.game === "reversi" ? m.reversi.hint : m.dots.hint}</p>
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

/**
 * Bajo el nombre: la ficha de cada uno en el 4 en raya, y además cuántas
 * fichas o cajas lleva en el Reversi y en puntos y cajas. En el 3 en raya, × u ○.
 */
function badgeDetail(loaded: Loaded, mark: Mark, m: Messages): ReactNode {
  if (loaded.game === "connect4") return <span className="mt-1 flex"><Disc mark={mark} /></span>;
  if (loaded.game === "reversi" || loaded.game === "dots") {
    const count = loaded.state.score[mark];
    return (
      <span className="mt-1 flex items-center gap-1.5">
        <Disc mark={mark} square={loaded.game === "dots"} />
        <span className="tabular text-sm font-semibold">{loaded.game === "reversi" ? m.reversi.pieces(count) : m.dots.boxes(count)}</span>
      </span>
    );
  }
  return undefined;
}

/** Quién ha perdido el turno con la última jugada (Reversi y puntos y cajas), si alguien. */
function extraTurn(loaded: Loaded, me: Mark, rivalName: string, m: Messages): string | null {
  if (loaded.game === "reversi" && loaded.state.passed) {
    return loaded.state.passed === me ? m.reversi.youPass : m.reversi.theyPass(rivalName);
  }
  if (loaded.game === "dots" && loaded.state.closed.length > 0 && loaded.state.turn) {
    return loaded.state.turn === me ? m.dots.again : m.dots.theyAgain(rivalName);
  }
  return null;
}

/** Ficha del color de cada jugador en el 4 en raya. */
function Disc({ mark, square = false }: { mark: Mark; square?: boolean }) {
  const m = useMessages();
  return (
    <span
      role="img"
      aria-label={mark === "x" ? m.match.redPieces : m.match.bluePieces}
      className={`size-4 shrink-0 ${square ? "rounded-sm" : "rounded-full"}`}
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
