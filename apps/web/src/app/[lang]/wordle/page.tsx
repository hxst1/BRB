import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { WordleGame, type FriendResult } from "@/components/wordle/game";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { wordleToday } from "@/lib/wordle/server";
import { GameGuideSection } from "@/components/seo/game-guide";
import { gameMetadata } from "@/lib/seo";
import { HowToPlayButton } from "@/components/how-to-play";
import { getLocale, getMessages } from "@/lib/i18n/server";

export const metadata: Metadata = gameMetadata("wordle");

export default async function WordlePage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem]">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="display text-6xl font-bold sm:text-7xl">{m.gameCards["wordle"].title}</h1>
          <HowToPlayButton game="wordle" name={m.gameCards["wordle"].title} />
        </div>
        <p className="mb-8 text-muted">{m.gamePages["wordle"]}</p>
        <Suspense fallback={<div className="mx-auto aspect-[5/6] max-w-[22rem] animate-pulse rounded-3xl bg-line/40" />}>
          <WordleForViewer />
        </Suspense>
      </div>
      <GameGuideSection id="wordle" />
    </main>
  );
}

async function WordleForViewer() {
  const [viewerId, m, locale] = await Promise.all([getViewerId(), getMessages(), getLocale()]);
  if (!viewerId) {
    return (
      <p>
        <Link href="/entrar?next=/wordle" className="font-medium underline underline-offset-4">
          {m.daily.signIn}
        </Link>{" "}
        {m.gamePages.wordleSignIn}
      </p>
    );
  }

  const [today, supabase] = await Promise.all([wordleToday(), createClient()]);
  const { data: game } = await supabase
    .from("wordle_games")
    .select("guesses, patterns, solved, finished_at")
    .eq("user_id", viewerId)
    .eq("day", today.day)
    .maybeSingle();

  const finished = game?.finished_at != null;
  const solved = game?.solved ?? false;
  const friends: FriendResult[] = finished ? ((await supabase.rpc("get_wordle_friends")).data ?? []) : [];

  return (
    <WordleGame
      day={today.day}
      dayLabel={new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${today.day}T00:00:00Z`))}
      initial={{
        guesses: game?.guesses ?? [],
        patterns: game?.patterns ?? [],
        solved,
        finished,
        // La palabra solo se envía si ya se ha fallado: antes, nunca.
        answer: finished && !solved ? today.word : null,
      }}
      initialFriends={friends}
    />
  );
}
