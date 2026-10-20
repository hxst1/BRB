"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Functions } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Challenge = Functions<"get_my_challenges">["Returns"][number];

/** Retos enviados y recibidos del 2048, con su resultado. */
export function ChallengesList({ refreshKey }: { refreshKey: number }) {
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
        Retos
      </h2>
      <ul className="flex flex-col">
        {rows.data.map((row) => (
          <li key={row.id} className="flex items-center gap-3 border-b border-line py-2.5">
            <Avatar seed={row.other_avatar_seed} parts={row.other_avatar_parts} size={34} />
            <span className="min-w-0 flex-1 text-sm">{describe(row)}</span>
            {row.incoming && row.status === "pending" && (
              <span className="flex shrink-0 items-center gap-3">
                <Link href={`/2048?reto=${row.id}`} className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-bg">
                  Jugar
                </Link>
                <button type="button" onClick={() => void decline(row.id)} className="text-sm text-muted hover:text-ink">
                  Rechazar
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function describe(row: Challenge): string {
  const target = formatNumber(row.target_score);
  const attempt = row.attempt_score === null ? "" : formatNumber(row.attempt_score);
  const name = row.other_username;
  const tie = row.status === "lost" && row.attempt_score === row.target_score;

  if (row.incoming) {
    switch (row.status) {
      case "pending":
        return `${name} te reta: supera ${target}`;
      case "playing":
        return `Estás jugando el reto de ${name}`;
      case "won":
        return `Superaste a ${name}: ${attempt} contra ${target}`;
      case "lost":
        if (tie) return `Empataste con ${name} a ${target}: había que superarle`;
        return attempt ? `${name} te ganó: ${target} contra tus ${attempt}` : `Abandonaste el reto de ${name}`;
      case "declined":
        return `Rechazaste el reto de ${name}`;
    }
  }
  switch (row.status) {
    case "pending":
      return `Retaste a ${name} a superar ${target}`;
    case "playing":
      return `${name} está jugando tu reto`;
    case "won":
      return `${name} te superó: ${attempt} contra tus ${target}`;
    case "lost":
      if (tie) return `${name} empató contigo a ${target}, pero no te superó`;
      return attempt ? `${name} no te superó: ${attempt} contra tus ${target}` : `${name} abandonó tu reto`;
    case "declined":
      return `${name} rechazó tu reto`;
  }
  return "";
}
