"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Match } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { challenge, fetchMatch, markOf, type MatchWithPlayers } from "@/components/tictactoe/data";
import { ResignButton } from "@/components/tictactoe/match-view";
import { MATCH_GAMES, matchHref } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import type { Messages } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/client";
import { MatchNotFound } from "@/components/match-not-found";
import { MatchSounds, resultFor } from "@/components/match-sounds";

type Mark = "x" | "o";

/**
 * Lo común de los juegos en directo (pong, Tron y la carrera de tecleo): aceptar o rechazar el
 * reto, rendirse, revancha y el resultado final. Mientras la partida está en
 * juego muestra `live`, que es el juego en sí.
 */
export function LiveMatchShell({
  matchId,
  viewerId,
  game,
  live,
}: {
  matchId: string;
  viewerId: string;
  game: "pong" | "tron" | "typing";
  live: (props: { match: Match; me: Mark; rivalName: string; onReported: () => void }) => ReactNode;
}) {
  const router = useRouter();
  const m = useMessages();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const path = MATCH_GAMES[game].path;

  const reload = useCallback(async () => setMatch(await fetchMatch(matchId)), [matchId]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchMatch(matchId).then((data) => {
      if (!cancelled) setMatch(data);
    });
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`${game}-match:${matchId}`))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (payload) => {
          setMatch((current) => (current ? { ...current, ...(payload.new as Match) } : current));
        })
        .subscribe(),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [matchId, game]);

  async function act(action: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    setError(null);
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) setError(m.match.actionError);
    else await reload();
  }

  async function rematch() {
    if (!match) return;
    setBusy(true);
    const rival = match.player_x === viewerId ? match.player_o : match.player_x;
    const id = await challenge(rival, game);
    setBusy(false);
    if (id) router.push(matchHref({ id, game }));
    else setError(m.match.rematchError);
  }

  // La carrera de tecleo, más ancha: el texto se lee mejor en líneas largas.
  const width = game === "typing" ? "max-w-xl" : "max-w-sm";
  if (match === undefined) return <div className={`aspect-[1/1.6] w-full ${width} animate-pulse rounded-3xl bg-line/40`} />;
  if (match === null || match.game !== game) {
    return <MatchNotFound path={path} />;
  }

  const me = markOf(match, viewerId);
  const rival = me === "x" ? match.o : match.x;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;

  return (
    <div className={`flex w-full ${width} flex-col gap-4`}>
      {/* La carrera acaba en cuanto llega el primero: el resultado suena aquí, no en la carrera. */}
      {game === "typing" && <MatchSounds progress={0} myTurn={false} result={resultFor(match, me)} />}
      {match.status === "active" ? (
        live({ match, me, rivalName: rival.username, onReported: reload })
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex items-center gap-4">
            <Avatar seed={match.x.avatar_seed} parts={match.x.avatar_parts} size={64} mood={moodOf(match, "x")} />
            <span className="text-sm text-muted">{m.match.versus}</span>
            <Avatar seed={match.o.avatar_seed} parts={match.o.avatar_parts} size={64} mood={moodOf(match, "o")} />
          </div>
          <p className="display text-3xl font-bold text-balance">{statusText(m, match, me, rival.username)}</p>
          {match.status === "finished" && match.end_reason === "points" && game === "typing" && (
            // La carrera guarda solo el tiempo del ganador, en décimas.
            <p className="tabular text-lg text-muted">{m.typing.winnerTime(m.format.time(match.moves[0]! * 100))}</p>
          )}
          {match.status === "finished" && match.end_reason === "points" && game !== "typing" && (
            <p className="tabular display text-5xl font-bold">
              {match.moves[me === "x" ? 0 : 1]} – {match.moves[me === "x" ? 1 : 0]}
            </p>
          )}
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
        {match.status === "active" && (
          <ResignButton disabled={busy} onConfirm={() => void act(() => createClient().rpc("resign_match", { match_id: match.id }))} />
        )}
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

function moodOf(match: Match, mark: Mark) {
  if (match.status !== "finished" || !match.winner) return "neutral" as const;
  return match.winner === mark ? ("happy" as const) : ("sad" as const);
}

function statusText(m: Messages, match: Match, me: Mark, rivalName: string): string {
  switch (match.status) {
    case "pending":
      return match.created_by === (me === "x" ? match.player_x : match.player_o) ? m.match.waitingAccept(rivalName) : m.match.challengesYou(rivalName);
    case "declined":
      return m.match.declined(rivalName);
    case "cancelled":
      return m.match.withdrawn;
    case "finished":
      if (match.end_reason === "disputed") return m.match.disputed;
      if (match.end_reason === "resign") return match.winner === me ? m.match.theyResigned(rivalName) : m.match.youResigned;
      return match.winner === me ? m.match.youWon : m.match.theyWon(rivalName);
    default:
      return "";
  }
}

