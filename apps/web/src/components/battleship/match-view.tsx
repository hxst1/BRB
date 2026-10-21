"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRng, randomSeed } from "@repo/games";
import { FLEET, replay, randomFleet, type Fleet, type Mark } from "@repo/games/battleship";
import type { Mood } from "@repo/avatars";
import type { Match } from "@repo/db";
import { challenge, fetchMatch, markOf, type MatchWithPlayers, type Player } from "@/components/tictactoe/data";
import { PlayerBadge, ResignButton } from "@/components/tictactoe/match-view";
import { MATCH_GAMES } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { SeaBoard } from "./board";
import { channelName, subscribeWhenReady } from "@/lib/realtime";

const PATH = MATCH_GAMES.battleship.path;

type Fleets = { mine: Fleet | null; rival: Fleet | null; rivalReady: boolean };

/**
 * Tu flota, la del rival (solo al acabar) y si el rival ya ha colocado la
 * suya. null si falla la carga: mejor mantener lo que había que pedir de
 * nuevo una flota que ya está colocada.
 */
async function fetchFleets(match: Match, viewerId: string): Promise<Fleets | null> {
  const supabase = createClient();
  const [{ data: fleets, error: fleetsError }, { data: status, error: statusError }] = await Promise.all([
    supabase.from("battleship_fleets").select("player_id, ships").eq("match_id", match.id),
    supabase.rpc("get_battleship_status"),
  ]);
  if (fleetsError || statusError) return null;
  const mine = (fleets?.find((f) => f.player_id === viewerId)?.ships as Fleet | undefined) ?? null;
  const rival = (fleets?.find((f) => f.player_id !== viewerId)?.ships as Fleet | undefined) ?? null;
  const rivalReady = rival !== null || (status?.find((s) => s.match_id === match.id)?.rival_ready ?? false);
  return { mine, rival, rivalReady };
}

function newDraft(): Fleet {
  return randomFleet(createRng(randomSeed())).fleet;
}

export function BattleshipMatchView({ matchId, viewerId }: { matchId: string; viewerId: string }) {
  const router = useRouter();
  const [match, setMatch] = useState<MatchWithPlayers | null | undefined>(undefined);
  const [fleets, setFleets] = useState<Fleets | null>(null);
  const [draft, setDraft] = useState<Fleet>(newDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si dos recargas se cruzan (p. ej. la de tu jugada y el aviso en directo
  // del rival), solo vale la última que se pidió.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const request = ++latest.current;
    const data = await fetchMatch(matchId);
    const loaded = data ? await fetchFleets(data, viewerId) : null;
    return { request, data, loaded };
  }, [matchId, viewerId]);
  const apply = useCallback(({ request, data, loaded }: Awaited<ReturnType<typeof load>>) => {
    if (request !== latest.current) return;
    setMatch(data);
    if (loaded) setFleets(loaded);
  }, []);
  const refresh = useCallback(async () => apply(await load()), [apply, load]);

  // Carga inicial y cambios en directo: disparos, aceptar, que el rival coloque su flota…
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    load().then((result) => {
      if (!cancelled) apply(result);
    });
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`match:${matchId}`))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => {
          void refresh();
        })
        // Lo que cambie mientras se conecta no llega por el canal: al quedar conectado, se recarga.
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void refresh();
        }),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [matchId, load, apply, refresh]);

  const act = useCallback(
    async (action: () => PromiseLike<{ error: unknown }>) => {
      setBusy(true);
      setError(null);
      const { error: actionError } = await action();
      setBusy(false);
      if (actionError) setError("No se ha podido completar. Recarga la página e inténtalo otra vez.");
      else await refresh();
    },
    [refresh],
  );

  async function post(path: "fleet" | "move", body: unknown) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/matches/${matchId}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se ha podido completar.");
    }
    await refresh();
    setBusy(false);
  }

  if (match === undefined || (match && fleets === null && match.status !== "pending")) {
    return <div className="sea-board aspect-square w-full max-w-md animate-pulse" />;
  }
  if (match === null || match.game !== "battleship") {
    return (
      <p className="text-muted">
        No encontramos esta partida.{" "}
        <Link href={PATH} className="font-medium text-ink underline underline-offset-4">
          Ver tus partidas
        </Link>
      </p>
    );
  }

  const me = markOf(match, viewerId);
  const rival: Mark = me === "x" ? "o" : "x";
  const players: Record<Mark, Player> = { x: match.x, o: match.o };
  const rivalName = players[rival].username;
  const state = replay(match.moves);
  const invitedMe = match.status === "pending" && match.created_by !== viewerId;
  const placing = match.status === "active" && fleets?.mine === null;
  const ready = match.status === "active" && fleets?.mine != null && fleets.rivalReady;
  const myTurn = ready && state?.turn === me;
  const winnerMark = match.status === "finished" ? (match.winner as Mark | null) : null;
  const moodOf = (mark: Mark): Mood =>
    match.status !== "finished" || !winnerMark ? "neutral" : winnerMark === mark ? "happy" : "sad";
  const afloat = (mark: Mark) => FLEET.length - (state?.shots[mark === "x" ? "o" : "x"].filter((s) => s.result === "sunk").length ?? 0);
  const lastShot = match.moves.length > 0 && state ? { by: (match.moves.length % 2 === 1 ? "x" : "o") as Mark, ...state.shots[match.moves.length % 2 === 1 ? "x" : "o"].at(-1)! } : null;

  const status = (() => {
    switch (match.status) {
      case "pending":
        return invitedMe ? `${rivalName} te reta` : `Esperando a que ${rivalName} acepte`;
      case "declined":
        return `${rivalName} ha rechazado el reto`;
      case "cancelled":
        return "Reto retirado";
      case "active":
        if (placing) return "Coloca tu flota";
        if (!fleets?.rivalReady) return `Esperando a que ${rivalName} coloque su flota`;
        return myTurn ? "Te toca disparar" : `Le toca a ${rivalName}`;
      default:
        if (match.end_reason === "resign") return match.winner === me ? `${rivalName} se ha rendido` : "Te has rendido";
        return match.winner === me ? "¡Has hundido su flota!" : `${rivalName} ha hundido tu flota`;
    }
  })();

  async function rematch() {
    setBusy(true);
    const id = await challenge(players[rival].id, "battleship");
    setBusy(false);
    if (id) router.push(`${PATH}/${id}`);
    else setError("No se ha podido crear la revancha.");
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <PlayerBadge
          player={players[me]}
          mark={me}
          label="Tú"
          active={myTurn}
          mood={moodOf(me)}
          detail={<Afloat count={afloat(me)} />}
        />
        <span className="text-sm text-muted">contra</span>
        <PlayerBadge
          player={players[rival]}
          mark={rival}
          active={ready && state?.turn === rival}
          mood={moodOf(rival)}
          alignEnd
          detail={<Afloat count={afloat(rival)} />}
        />
      </div>

      <div className="text-center">
        <p aria-live="polite" className="display text-3xl font-bold">
          {status}
        </p>
        {lastShot && match.status === "active" && (
          <p className="mt-1 text-sm text-muted">
            {lastShot.by === me ? "Tu disparo" : `Disparo de ${rivalName}`}: {SHOT_TEXT[lastShot.result]}
          </p>
        )}
      </div>

      {placing && (
        <div className="flex flex-col gap-3">
          <SeaBoard label="Tu flota" fleet={draft} shots={[]} />
          <p className="text-sm text-muted">
            Cinco barcos: de 5, 4, 3, 3 y 2 casillas. Muévelos hasta que te guste la colocación; {rivalName} no la verá.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void post("fleet", { ships: draft })}
              className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg disabled:opacity-50"
            >
              Listo, a jugar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDraft(newDraft())}
              className="rounded-full border border-line bg-surface px-5 py-2.5 font-semibold"
            >
              Mover los barcos
            </button>
          </div>
        </div>
      )}

      {match.status !== "pending" && !placing && fleets?.mine && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Flota de {rivalName}</h2>
            <SeaBoard
              label={`Flota de ${rivalName}`}
              fleet={fleets.rival}
              shots={state?.shots[me] ?? []}
              onShoot={myTurn && !busy ? (cell) => void post("move", { cell }) : undefined}
              highlight={lastShot?.by === me ? lastShot.cell : null}
            />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Tu flota</h2>
            <div className="mx-auto w-3/4">
              <SeaBoard
                label="Tu flota"
                fleet={fleets.mine}
                shots={state?.shots[rival] ?? []}
                highlight={lastShot?.by === rival ? lastShot.cell : null}
              />
            </div>
          </section>
        </>
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
        <Link href={PATH} className="text-sm text-muted hover:text-ink">
          Todas tus partidas
        </Link>
      </div>
    </div>
  );
}

const SHOT_TEXT = { miss: "agua", hit: "¡tocado!", sunk: "¡hundido!" } as const;

function Afloat({ count }: { count: number }) {
  return <span className="text-sm text-muted">{count === 1 ? "1 barco a flote" : `${count} barcos a flote`}</span>;
}
