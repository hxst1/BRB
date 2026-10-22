"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Match } from "@repo/db";
import { describeChallenge, type Challenge } from "@/components/game2048/challenge-text";
import { isTurnBased, markOf, turnOf } from "@/components/tictactoe/data";
import { matchGameKey, matchHref } from "@/lib/games";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Tarjeta de un reto dentro del chat, con su estado actual y sus acciones. */
export function ChallengeEmbed({
  kind,
  mine,
  viewerId,
  friendName,
  match,
  challenge,
  onChanged,
}: {
  kind: "match" | "challenge";
  mine: boolean;
  viewerId: string;
  friendName: string;
  match: Match | undefined;
  challenge: Challenge | undefined;
  onChanged: () => void;
}) {
  const router = useRouter();
  const m = useMessages();
  const [busy, setBusy] = useState(false);

  async function run(action: () => PromiseLike<{ error: unknown }>, then?: () => void) {
    setBusy(true);
    const { error } = await action();
    setBusy(false);
    onChanged();
    if (!error) then?.();
  }

  let title: string;
  let status: string;
  let actions: ReactNode = null;

  if (kind === "match") {
    title = match ? m.matchGames[matchGameKey(match.game)] : m.embed.match;
    if (!match) {
      status = m.embed.loading;
    } else {
      const href = matchHref(match);
      const incoming = match.created_by !== viewerId;
      switch (match.status) {
        case "pending":
          status = incoming ? m.match.challengesYou(friendName) : m.match.waitingAccept(friendName);
          actions = incoming ? (
            <>
              <EmbedButton
                primary
                disabled={busy}
                onClick={() =>
                  run(
                    () => createClient().rpc("respond_match", { match_id: match.id, accept: true }),
                    () => router.push(href),
                  )
                }
              >
                {m.now.accept}
              </EmbedButton>
              <EmbedButton disabled={busy} onClick={() => run(() => createClient().rpc("respond_match", { match_id: match.id, accept: false }))}>
                {m.now.decline}
              </EmbedButton>
            </>
          ) : (
            <EmbedButton disabled={busy} onClick={() => run(() => createClient().rpc("cancel_match", { match_id: match.id }))}>
              {m.embed.withdraw}
            </EmbedButton>
          );
          break;
        case "active": {
          if (!isTurnBased(match.game)) {
            // Piedra, papel o tijera: quién ha elegido es secreto. Pong: se juega en directo.
            status = match.game === "pong" || match.game === "tron" ? m.embed.acceptedLive : m.embed.inPlay;
            actions = <EmbedLink href={href} primary>{m.common.play}</EmbedLink>;
            break;
          }
          const myTurn = turnOf(match) === markOf(match, viewerId);
          status = myTurn ? m.embed.yourTurn : m.embed.theirTurn(friendName);
          actions = <EmbedLink href={href} primary={myTurn}>{myTurn ? m.common.play : m.embed.see}</EmbedLink>;
          break;
        }
        case "finished":
          status = !match.winner ? m.match.draw : match.winner === markOf(match, viewerId) ? m.matchList.won : m.embed.theyWon(friendName);
          actions = <EmbedLink href={href}>{m.embed.see}</EmbedLink>;
          break;
        case "declined":
          status = incoming ? m.embed.youDeclined : m.embed.theyDeclined(friendName);
          break;
        default:
          status = m.match.withdrawn;
      }
    }
  } else {
    title = "2048";
    if (!challenge) {
      status = m.embed.loading;
    } else {
      status = describeChallenge(challenge, m);
      if (challenge.incoming && challenge.status === "pending") {
        status = m.embed.beat(m.format.number(challenge.target_score));
        actions = (
          <>
            <EmbedLink href={`/2048?reto=${challenge.id}`} primary>
              {m.common.play}
            </EmbedLink>
            <EmbedButton disabled={busy} onClick={() => run(() => createClient().rpc("decline_challenge", { challenge_id: challenge.id }))}>
              {m.now.decline}
            </EmbedButton>
          </>
        );
      }
    }
  }

  return (
    <div
      className={`flex w-72 max-w-[85%] flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-soft ${
        mine ? "self-end rounded-br-md" : "self-start rounded-bl-md"
      }`}
    >
      <div className="flex items-center gap-3">
        <EmbedIcon kind={kind} game={match?.game} />
        <div className="min-w-0">
          <p className="text-xs text-muted">{mine ? m.embed.yourChallenge : m.embed.challengeFrom(friendName)}</p>
          <p className="display text-xl leading-tight font-bold">{title}</p>
        </div>
      </div>
      <p className="text-sm">{status}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function EmbedIcon({ kind, game }: { kind: "match" | "challenge"; game?: string }) {
  if (kind === "match" && game === "connect4") {
    return (
      <span aria-hidden className="grid size-11 shrink-0 grid-cols-4 content-end gap-0.5 rounded-xl p-1" style={{ background: "var(--board)" }}>
        {["", "", "o", "", "", "x", "o", "", "o", "x", "x", "o"].map((mark, i) => (
          <span
            key={i}
            className="aspect-square rounded-full"
            style={{ background: mark === "x" ? "var(--mark-x)" : mark === "o" ? "var(--mark-o)" : "var(--cell)" }}
          />
        ))}
      </span>
    );
  }
  if (kind === "match" && game && game !== "tictactoe") {
    return (
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: "var(--board)" }}>
        {game === "pong" ? "🏓" : game === "tron" ? "🏍️" : game === "battleship" ? "🚢" : game === "rpsls" ? "🖖" : "✂️"}
      </span>
    );
  }
  if (kind === "match") {
    return (
      <span aria-hidden className="grid size-11 shrink-0 grid-cols-3 gap-0.5 rounded-xl p-1" style={{ background: "var(--board)" }}>
        {["×", "", "○", "", "×", "", "○", "", ""].map((mark, i) => (
          <span
            key={i}
            className="grid place-items-center rounded-[3px] text-[9px] leading-none font-bold"
            style={{ background: "var(--cell)", color: mark === "×" ? "var(--mark-x)" : "var(--mark-o)" }}
          >
            {mark}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span aria-hidden className="grid size-11 shrink-0 grid-cols-2 gap-0.5 rounded-xl p-1" style={{ background: "var(--board)" }}>
      {[2048, 8, 64, 512].map((value) => (
        <span key={value} className="rounded-[4px]" style={{ background: `var(--t${value})` }} />
      ))}
    </span>
  );
}

const EMBED_ACTION = "rounded-full px-3.5 py-1.5 text-sm font-medium disabled:opacity-50";

function EmbedButton({
  children,
  onClick,
  disabled,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${EMBED_ACTION} ${primary ? "bg-ink text-bg" : "border border-line hover:border-muted"}`}
    >
      {children}
    </button>
  );
}

function EmbedLink({ children, href, primary = false }: { children: ReactNode; href: string; primary?: boolean }) {
  return (
    <Link href={href} className={`${EMBED_ACTION} ${primary ? "bg-ink text-bg" : "border border-line hover:border-muted"}`}>
      {children}
    </Link>
  );
}
