"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import { fetchFriends, type Friend } from "@/lib/friends";
import { matchHref, type MatchGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { challenge, fetchChosen, fetchMyMatches, isMyTurn, markOf, opponentOf, type MatchWithPlayers } from "./data";
import { channelName, subscribeWhenReady } from "@/lib/realtime";
import { useMessages } from "@/lib/i18n/client";
import { MatchRowsSkeleton } from "./match-list-skeleton";
import type { Messages } from "@/lib/i18n";

type Loaded = { matches: MatchWithPlayers[]; chosen: Set<string> };

async function load(games: readonly MatchGame[], viewerId: string): Promise<Loaded> {
  const matches = await fetchMyMatches(games);
  return { matches, chosen: await fetchChosen(matches, viewerId) };
}

/**
 * Partidas contra amigos de uno o varios juegos. Si hay varios (las dos
 * variantes de piedra, papel o tijera), al retar se elige cuál.
 */
export function MatchList({ viewerId, games }: { viewerId: string; games: readonly MatchGame[] }) {
  const router = useRouter();
  const m = useMessages();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [game, setGame] = useState<MatchGame>(games[0]!);
  const gamesKey = games.join(",");

  const reload = useCallback(async () => setLoaded(await load(games, viewerId)), [games, viewerId]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const list = gamesKey.split(",") as MatchGame[];
    load(list, viewerId).then((data) => {
      if (!cancelled) setLoaded(data);
    });

    // Sin filtro: RLS ya hace que solo lleguen las partidas en las que juego.
    const unsubscribe = subscribeWhenReady(supabase, () =>
      supabase
        .channel(channelName(`my-matches:${gamesKey}`))
        .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
          load(list, viewerId).then((data) => {
            if (!cancelled) setLoaded(data);
          });
        })
        .subscribe(),
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [gamesKey, viewerId]);

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
          {m.run.challengeFriend}
        </button>
        {picking && (
          <div className="rounded-3xl bg-surface p-3 shadow-soft">
            {games.length > 1 && (
              <div role="radiogroup" aria-label={m.matchList.mode} className="mb-2 flex gap-1 rounded-full bg-line/60 p-1">
                {games.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={game === option}
                    onClick={() => setGame(option)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-sm ${game === option ? "bg-surface font-medium shadow-soft" : "text-muted"}`}
                  >
                    {modeLabel(m, option) ?? m.matchGames[option]}
                  </button>
                ))}
              </div>
            )}
            {friends === null && <p className="p-2 text-sm text-muted">{m.matchList.loadingFriends}</p>}
            {friends?.length === 0 && (
              <p className="p-2 text-sm text-muted">
                {m.matchList.noFriends}{" "}
                <Link href="/amigos" className="font-medium text-ink underline underline-offset-4">
                  {m.matchList.addSomeone}
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
                    <span className="text-sm text-muted">{m.challengeMenu.challenge}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {matches === null ? (
        <MatchRowsSkeleton />
      ) : matches.length === 0 ? (
        <p className="reveal-in text-muted">{m.matchList.empty}</p>
      ) : (
        <div className="reveal contents">
          <Group title={m.matchList.invited} matches={groups.invited} viewerId={viewerId} note={() => m.matchList.wantsToPlay} />
          <Group title={m.match.yourTurn} matches={groups.myTurn} viewerId={viewerId} note={() => m.matchList.yourTurn} highlight />
          <Group title={m.matchList.waiting} matches={groups.waiting} viewerId={viewerId} note={(match) => (match.status === "pending" ? m.matchList.notAccepted : m.matchList.theirTurn)} />
          <Group title={m.matchList.finished} matches={groups.finished} viewerId={viewerId} note={(match) => resultText(m, match, viewerId)} />
        </div>
      )}
    </div>
  );
}

/** Nombre corto de cada modo en el selector (solo piedra, papel o tijera tiene dos). */
function modeLabel(m: Messages, game: MatchGame): string | undefined {
  return game === "rps" ? m.matchList.classic : game === "rpsls" ? m.matchList.lizardSpock : undefined;
}

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

function resultText(m: Messages, match: MatchWithPlayers, viewerId: string): string {
  if (!match.winner) return m.match.draw;
  return match.winner === markOf(match, viewerId) ? m.matchList.won : m.matchList.lost;
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
  const m = useMessages();
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
                  {modeLabel(m, match.game as MatchGame) && <span className="text-xs text-muted">{modeLabel(m, match.game as MatchGame)}</span>}
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
