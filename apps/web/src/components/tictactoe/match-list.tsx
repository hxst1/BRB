"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { fetchFriends, type Friend } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { challenge, fetchMyMatches, markOf, opponentOf, turnOf, type MatchWithPlayers } from "./data";

export function MatchList({ viewerId }: { viewerId: string }) {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchWithPlayers[] | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picking, setPicking] = useState(false);

  const reload = useCallback(async () => setMatches(await fetchMyMatches()), []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    fetchMyMatches().then((data) => {
      if (!cancelled) setMatches(data);
    });

    // Sin filtro: RLS ya hace que solo lleguen las partidas en las que juego.
    const channel = supabase
      .channel("my-matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchMyMatches().then((data) => {
          if (!cancelled) setMatches(data);
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  async function openPicker() {
    setPicking(true);
    if (friends) return;
    setFriends(await fetchFriends(viewerId));
  }

  async function challengeFriend(friendId: string) {
    const id = await challenge(friendId);
    if (id) router.push(`/3-en-raya/${id}`);
    else void reload();
  }

  const groups = groupMatches(matches ?? [], viewerId);

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
            {friends === null && <p className="p-2 text-sm text-muted">Cargando amigos…</p>}
            {friends?.length === 0 && (
              <p className="p-2 text-sm text-muted">
                Aún no tienes amigos.{" "}
                <Link href="/perfil" className="font-medium text-ink underline underline-offset-4">
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

function groupMatches(matches: MatchWithPlayers[], viewerId: string) {
  const groups = { invited: [], myTurn: [], waiting: [], finished: [] } as Record<
    "invited" | "myTurn" | "waiting" | "finished",
    MatchWithPlayers[]
  >;
  for (const match of matches) {
    if (match.status === "finished") groups.finished.push(match);
    else if (match.status === "pending") (match.created_by === viewerId ? groups.waiting : groups.invited).push(match);
    else if (turnOf(match) === markOf(match, viewerId)) groups.myTurn.push(match);
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
              <Link href={`/3-en-raya/${match.id}`} className="flex items-center gap-3 border-b border-line py-2.5 hover:bg-surface/60">
                <Avatar seed={rival.avatar_seed} parts={rival.avatar_parts} size={36} />
                <span className="min-w-0 flex-1 truncate font-medium">{rival.username}</span>
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
