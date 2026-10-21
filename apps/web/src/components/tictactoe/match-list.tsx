"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import { fetchFriends, type Friend } from "@/lib/friends";
import { MATCH_GAMES, matchHref, type MatchGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { challenge, fetchChosen, fetchMyMatches, isMyTurn, markOf, opponentOf, type MatchWithPlayers } from "./data";

type Loaded = { matches: MatchWithPlayers[]; chosen: Set<string> };

async function load(games: readonly MatchGame[]): Promise<Loaded> {
  const matches = await fetchMyMatches(games);
  return { matches, chosen: await fetchChosen(matches) };
}

/**
 * Partidas contra amigos de uno o varios juegos. Si hay varios (las dos
 * variantes de piedra, papel o tijera), al retar se elige cuál.
 */
export function MatchList({ viewerId, games }: { viewerId: string; games: readonly MatchGame[] }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [game, setGame] = useState<MatchGame>(games[0]!);
  const gamesKey = games.join(",");

  const reload = useCallback(async () => setLoaded(await load(games)), [games]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const list = gamesKey.split(",") as MatchGame[];
    load(list).then((data) => {
      if (!cancelled) setLoaded(data);
    });

    // Sin filtro: RLS ya hace que solo lleguen las partidas en las que juego.
    const channel = supabase
      .channel(`my-matches:${gamesKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        load(list).then((data) => {
          if (!cancelled) setLoaded(data);
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [gamesKey]);

  const matches = loaded?.matches ?? null;

  async function openPicker() {
    setPicking(true);
    if (friends) return;
    setFriends(await fetchFriends(viewerId));
  }

  async function challengeFriend(friendId: string) {
    const id = await challenge(friendId, game);
    if (id) router.push(matchHref({ id, game }));
    else void reload();
  }

  const groups = groupMatches(matches ?? [], viewerId, loaded?.chosen ?? new Set());

  return (
    <div className="flex w-full max-w-xl flex-col gap-10">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void (picking ? setPicking(false) : openPicker())}
          aria-expanded={picking}
          className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
        >
          Retar a un amigo
        </button>
        {picking && (
          <div className="rounded-3xl bg-surface p-3 shadow-soft">
            {games.length > 1 && (
              <div role="radiogroup" aria-label="Modo" className="mb-2 flex gap-1 rounded-full bg-line/60 p-1">
                {games.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={game === option}
                    onClick={() => setGame(option)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-sm ${game === option ? "bg-surface font-medium shadow-soft" : "text-muted"}`}
                  >
                    {GAME_MODE_LABELS[option] ?? MATCH_GAMES[option].name}
                  </button>
                ))}
              </div>
            )}
            {friends === null && <p className="p-2 text-sm text-muted">Cargando amigos…</p>}
            {friends?.length === 0 && (
              <p className="p-2 text-sm text-muted">
                Aún no tienes amigos.{" "}
                <Link href="/amigos" className="font-medium text-ink underline underline-offset-4">
                  Añade a alguien con su código
                </Link>
                .
              </p>
            )}
            <ul className="flex flex-col">
              {friends?.map((friend) => (
                <li key={friend.id}>
                  <button
                    type="button"
                    onClick={() => void challengeFriend(friend.id)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-bg"
                  >
                    <Avatar seed={friend.avatar_seed} parts={friend.avatar_parts} size={36} />
                    <span className="flex-1 font-medium">{friend.username}</span>
                    <span className="text-sm text-muted">Retar</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {matches === null ? (
        <div className="h-40 animate-pulse rounded-3xl bg-line/40" />
      ) : matches.length === 0 ? (
        <p className="text-muted">Todavía no has jugado ninguna partida. Reta a un amigo para empezar.</p>
      ) : (
        <>
          <Group title="Te retan" matches={groups.invited} viewerId={viewerId} note={() => "Quiere jugar contigo"} />
          <Group title="Te toca" matches={groups.myTurn} viewerId={viewerId} note={() => "Tu turno"} highlight />
          <Group title="Esperando" matches={groups.waiting} viewerId={viewerId} note={(m) => (m.status === "pending" ? "Aún no ha aceptado" : "Le toca")} />
          <Group title="Terminadas" matches={groups.finished} viewerId={viewerId} note={(m) => resultText(m, viewerId)} />
        </>
      )}
    </div>
  );
}

/** Nombre corto de cada modo en el selector. */
const GAME_MODE_LABELS: Partial<Record<MatchGame, string>> = { rps: "Clásico", rpsls: "Lagarto Spock" };

function groupMatches(matches: MatchWithPlayers[], viewerId: string, chosen: ReadonlySet<string>) {
  const groups = { invited: [], myTurn: [], waiting: [], finished: [] } as Record<
    "invited" | "myTurn" | "waiting" | "finished",
    MatchWithPlayers[]
  >;
  for (const match of matches) {
    if (match.status === "finished") groups.finished.push(match);
    else if (match.status === "pending") (match.created_by === viewerId ? groups.waiting : groups.invited).push(match);
    else if (isMyTurn(match, viewerId, chosen)) groups.myTurn.push(match);
    else groups.waiting.push(match);
  }
  groups.finished = groups.finished.slice(0, 10);
  return groups;
}

function resultText(match: MatchWithPlayers, viewerId: string): string {
  if (!match.winner) return "Empate";
  return match.winner === markOf(match, viewerId) ? "Ganaste" : "Perdiste";
}

function Group({
  title,
  matches,
  viewerId,
  note,
  highlight = false,
}: {
  title: string;
  matches: MatchWithPlayers[];
  viewerId: string;
  note: (match: MatchWithPlayers) => string;
  highlight?: boolean;
}) {
  if (matches.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-sm text-muted">{title}</h2>
      <ul className="flex flex-col">
        {matches.map((match) => {
          const rival = opponentOf(match, viewerId);
          return (
            <li key={match.id}>
              <Link href={matchHref(match)} className="flex items-center gap-3 border-b border-line py-2.5 hover:bg-surface/60">
                <Avatar seed={rival.avatar_seed} parts={rival.avatar_parts} size={36} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{rival.username}</span>
                  {GAME_MODE_LABELS[match.game as MatchGame] && (
                    <span className="text-xs text-muted">{GAME_MODE_LABELS[match.game as MatchGame]}</span>
                  )}
                </span>
                <span className={`text-sm ${highlight ? "rounded-full bg-ink px-3 py-1 font-medium text-bg" : "text-muted"}`}>
                  {note(match)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
