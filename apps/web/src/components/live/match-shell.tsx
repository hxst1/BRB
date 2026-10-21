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

type Mark = "x" | "o";

/**
 * Lo común de los juegos en directo (pong y Tron): aceptar o rechazar el
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
  game: "pong" | "tron";
  live: (props: { match: Match; me: Mark; rivalName: string; onReported: () => void }) => ReactNode;
}) {
  const router = useRouter();
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
    if (actionError) setError("No se ha podido completar. Recarga la página e inténtalo otra vez.");
    else await reload();
  }

  async function rematch() {
    if (!match) return;
    setBusy(true);
    const rival = match.player_x === viewerId ? match.player_o : match.player_x;
    const id = await challenge(rival, game);
    setBusy(false);
    if (id) router.push(matchHref({ id, game }));
    else setError("No se ha podido crear la revancha.");
  }

  if (match === undefined) return <div className="aspect-[1/1.6] w-full max-w-sm animate-pulse rounded-3xl bg-line/40" />;
  if (match === null || match.game !== game) {
    return (
      <p className="text-muted">
        No encontramos esta partida.{" "}
        <Link href={path} className="font-medium text-ink underline underline-offset-4">
          Ver tus partidas
        </Link>
      </p>
    );
  }

  const me = markOf(match, viewerId);
  const rival = me === "x" ? match.o : match.x;
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {match.status === "active" ? (
        live({ match, me, rivalName: rival.username, onReported: reload })
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex items-center gap-4">
            <Avatar seed={match.x.avatar_seed} parts={match.x.avatar_parts} size={64} mood={moodOf(match, "x")} />
            <span className="text-sm text-muted">contra</span>
            <Avatar seed={match.o.avatar_seed} parts={match.o.avatar_parts} size={64} mood={moodOf(match, "o")} />
          </div>
          <p className="display text-3xl font-bold text-balance">{statusText(match, me, rival.username)}</p>
          {match.status === "finished" && match.end_reason === "points" && (
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
        <Link href={path} className="text-sm text-muted hover:text-ink">
          Todas tus partidas
        </Link>
      </div>
    </div>
  );
}

function moodOf(match: Match, mark: Mark) {
  if (match.status !== "finished" || !match.winner) return "neutral" as const;
  return match.winner === mark ? ("happy" as const) : ("sad" as const);
}

function statusText(match: Match, me: Mark, rivalName: string): string {
  switch (match.status) {
    case "pending":
      return match.created_by === (me === "x" ? match.player_x : match.player_o) ? `Esperando a que ${rivalName} acepte` : `${rivalName} te reta`;
    case "declined":
      return `${rivalName} ha rechazado el reto`;
    case "cancelled":
      return "Reto retirado";
    case "finished":
      if (match.end_reason === "disputed") return "Los marcadores no coincidían: partida sin ganador";
      if (match.end_reason === "resign") return match.winner === me ? `${rivalName} se ha rendido` : "Te has rendido";
      return match.winner === me ? "¡Has ganado!" : `Gana ${rivalName}`;
    default:
      return "";
  }
}

