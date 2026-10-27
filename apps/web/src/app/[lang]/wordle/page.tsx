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
import { CONTENT_LANGUAGES, contentLanguage, isContentLanguage, type ContentLanguage } from "@/lib/i18n/locales";

export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("wordle", await getLocale());
}

export default async function WordlePage({ searchParams }: PageProps<"/[lang]/wordle">) {
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
          <WordleForViewer searchParams={searchParams} />
        </Suspense>
      </div>
      <GameGuideSection id="wordle" />
    </main>
  );
}

/**
 * Las palabras van en el idioma de la app, salvo que se elijan las del otro
 * (?palabras=en). En japonés aún no hay palabras: se juega con las inglesas.
 */
async function WordleForViewer({ searchParams }: { searchParams: PageProps<"/[lang]/wordle">["searchParams"] }) {
  const [viewerId, m, locale, { palabras }] = await Promise.all([getViewerId(), getMessages(), getLocale(), searchParams]);
  const lang: ContentLanguage = isContentLanguage(palabras) ? palabras : contentLanguage(locale);
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

  const [today, supabase] = await Promise.all([wordleToday(lang), createClient()]);
  const { data: game } = await supabase
    .from("wordle_games")
    .select("guesses, patterns, solved, finished_at")
    .eq("user_id", viewerId)
    .eq("day", today.day)
    .eq("lang", lang)
    .maybeSingle();

  const finished = game?.finished_at != null;
  const solved = game?.solved ?? false;
  const friends: FriendResult[] = finished ? ((await supabase.rpc("get_wordle_friends", { lang })).data ?? []) : [];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={m.wordle.wordsIn} className="inline-flex self-start rounded-full bg-line/60 p-1">
        {CONTENT_LANGUAGES.map((option) => (
          <Link
            key={option}
            href={`/wordle?palabras=${option}`}
            scroll={false}
            aria-current={option === lang ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${option === lang ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"}`}
          >
            {m.wordle.words[option]}
          </Link>
        ))}
      </nav>
      <WordleGame
        key={lang}
        lang={lang}
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
    </div>
  );
}
