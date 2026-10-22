"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { describeChallenge as describe, type Challenge } from "./challenge-text";
import { useMessages } from "@/lib/i18n/client";


/** Retos enviados y recibidos del 2048, con su resultado. */
export function ChallengesList({ refreshKey }: { refreshKey: number }) {
  const m = useMessages();
  const [rows, setRows] = useState<{ key: string; data: Challenge[] } | null>(null);
  const [reloads, setReloads] = useState(0);
  const key = `${refreshKey}:${reloads}`;

  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("get_my_challenges", { max_rows: 20 })
      .then(({ data }) => {
        if (!cancelled) setRows({ key, data: data ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  async function decline(id: string) {
    await createClient().rpc("decline_challenge", { challenge_id: id });
    setReloads((n) => n + 1);
  }

  if (!rows || rows.data.length === 0) return null;

  return (
    <section aria-labelledby="challenges-title" className="flex w-full max-w-[30rem] flex-col gap-3 lg:max-w-none">
      <h2 id="challenges-title" className="display text-3xl font-bold">
        {m.challenge2048.title}
      </h2>
      <ul className="flex flex-col">
        {rows.data.map((row) => (
          <li key={row.id} className="flex items-center gap-3 border-b border-line py-2.5">
            <Avatar seed={row.other_avatar_seed} parts={row.other_avatar_parts} size={34} />
            <span className="min-w-0 flex-1 text-sm">{describe(row, m)}</span>
            {row.incoming && row.status === "pending" && (
              <span className="flex shrink-0 items-center gap-3">
                <Link href={`/2048?reto=${row.id}`} className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-bg">
                  {m.common.play}
                </Link>
                <button type="button" onClick={() => void decline(row.id)} className="text-sm text-muted hover:text-ink">
                  {m.now.decline}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
