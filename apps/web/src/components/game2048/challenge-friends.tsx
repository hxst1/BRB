"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import { useMessages } from "@/lib/i18n/client";
import { fetchFriends, type Friend } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

/** Elige a quién retar a superar la partida que acabas de jugar. */
export function ChallengeFriends({
  viewerId,
  runId,
  score,
  onClose,
}: {
  viewerId: string;
  runId: string;
  score: number;
  onClose: () => void;
}) {
  const m = useMessages();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFriends(viewerId).then((data) => {
      if (!cancelled) setFriends(data);
    });
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  async function send(friendId: string) {
    setError(null);
    const { error: rpcError } = await createClient().rpc("create_challenge", { run_id: runId, friend: friendId });
    if (rpcError) setError(m.challenge2048.sendError);
    else setSent((current) => new Set(current).add(friendId));
  }

  return (
    <section aria-labelledby="challenge-title" className="rounded-3xl bg-surface p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="challenge-title" className="font-semibold">
          {m.challenge2048.whoBeats(m.format.number(score))}
        </h2>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
          {m.common.close}
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">{m.challenge2048.sameGame}</p>

      {friends === null && <p className="text-sm text-muted">{m.matchList.loadingFriends}</p>}
      {friends?.length === 0 && (
        <p className="text-sm text-muted">
          {m.matchList.noFriends}{" "}
          <Link href="/amigos" className="font-medium text-ink underline underline-offset-4">
            {m.matchList.addSomeone}
          </Link>
          .
        </p>
      )}
      <ul className="flex flex-col">
        {friends?.map((friend) => (
          <li key={friend.id} className="flex items-center gap-3 py-1.5">
            <Avatar seed={friend.avatar_seed} parts={friend.avatar_parts} size={34} />
            <span className="min-w-0 flex-1 truncate font-medium">{friend.username}</span>
            {sent.has(friend.id) ? (
              <span className="text-sm text-muted">{m.challenge2048.sent}</span>
            ) : (
              <button
                type="button"
                onClick={() => void send(friend.id)}
                className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-bg"
              >
                {m.challengeMenu.challenge}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
