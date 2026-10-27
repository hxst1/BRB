import Link from "next/link";
import { Suspense } from "react";
import type { Functions, Match } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { DailyCards, type DailyCardData } from "@/components/daily/daily-cards";
import { StreakHero } from "@/components/streak/streak-hero";
import { LevelBar } from "@/components/level-bar";
import { myTurnIn, waitingOnRival } from "@/lib/match-turns";
import { CHALLENGE_EXPIRY_MS, matchGameKey, matchHref } from "@/lib/games";
import { getMessages } from "@/lib/i18n/server";
import { MATCH_WITH_PLAYERS, PLAYER_COLUMNS } from "@/lib/queries";
import type { Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LatestNews } from "@/components/news/latest-news";
import { FirstSteps, type FirstStep } from "./first-steps";
import { QuickGames } from "./quick-games";
import { NowSection, type NowItem, type WaitingItem } from "./now";

/** Los primeros pasos solo salen a las cuentas nuevas (las de antes ya saben moverse). */
const FIRST_STEPS_DAYS = 14;

export async function Dashboard({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const m = await getMessages();
  const { ago, number, timeLeft } = m.format;
  const [
    { data: matches },
    { data: requests },
    { data: challenges },
    { data: streak },
    { data: dailies },
    { data: profile },
    { data: steps },
  ] =
    await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_WITH_PLAYERS)
      .in("status", ["pending", "active"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("friendships")
      .select(`id, created_at, requester:profiles!friendships_requester_id_fkey(${PLAYER_COLUMNS})`)
      .eq("status", "pending")
      .eq("addressee_id", viewer.id),
    supabase.rpc("get_my_challenges", { max_rows: 20 }),
    supabase.rpc("get_my_streak").maybeSingle(),
    supabase.rpc("get_my_dailies"),
    supabase.from("profiles").select("first_steps_dismissed, created_at").eq("id", viewer.id).single(),
    // La misma regla que el logro "Primeros pasos".
    supabase.rpc("get_my_first_steps").maybeSingle(),
  ]);

  // Partidas en las que se espera al rival aunque no se vea por los movimientos.
  const chosen = await waitingOnRival(supabase, matches ?? [], viewer.id);

  // "Ahora": lo que te toca (primero), retos recibidos, retos al 2048 y solicitudes.
  const now: NowItem[] = [];
  const invites: NowItem[] = [];
  const waiting: WaitingItem[] = [];
  const expiresAt = (match: Match) => new Date(new Date(match.created_at).getTime() + CHALLENGE_EXPIRY_MS);
  for (const match of matches ?? []) {
    const rival = match.player_x === viewer.id ? match.o : match.x;
    const icon = matchGameKey(match.game);
    const name = m.matchGames[icon];
    if (match.status === "pending") {
      if (match.created_by !== viewer.id) {
        invites.push({
          key: match.id,
          kind: "invite",
          id: match.id,
          href: matchHref(match),
          person: rival,
          icon,
          title: m.home.challengesYou(rival.username, name),
          detail: m.home.inviteDetail(capitalize(ago(match.created_at)), timeLeft(expiresAt(match))),
        });
      } else {
        waiting.push({
          key: match.id,
          href: matchHref(match),
          person: rival,
          icon,
          title: m.home.waitingTitle(rival.username, name),
          detail: m.home.expiresIn(timeLeft(expiresAt(match))),
        });
      }
    } else if (myTurnIn(match, viewer.id, chosen)) {
      now.push({
        key: match.id,
        kind: "turn",
        id: match.id,
        href: matchHref(match),
        person: rival,
        icon,
        title: match.game === "pong" || match.game === "tron" ? m.home.liveAgainst(name, rival.username) : m.home.yourTurnAgainst(rival.username),
        detail: match.game === "pong" || match.game === "tron" ? m.home.liveJoin : `${name}, ${ago(match.updated_at)}`,
      });
    }
  }
  now.push(...invites);
  for (const challenge of challenges ?? []) {
    if (!challenge.incoming || challenge.status !== "pending") continue;
    now.push({
      key: challenge.id,
      kind: "challenge",
      id: challenge.id,
      href: `/2048?reto=${challenge.id}`,
      person: {
        id: challenge.other_id,
        username: challenge.other_username,
        avatar_seed: challenge.other_avatar_seed,
        avatar_parts: challenge.other_avatar_parts,
      },
      icon: "2048",
      title: m.home.challenge2048(challenge.other_username),
      detail: m.home.challenge2048Detail(number(challenge.target_score), capitalize(ago(challenge.created_at))),
    });
  }
  for (const request of requests ?? []) {
    now.push({
      key: request.id,
      kind: "friend",
      id: request.id,
      href: "/amigos",
      person: request.requester,
      icon: "friend",
      title: m.home.wantsToBeFriends(request.requester.username),
      detail: capitalize(ago(request.created_at)),
    });
  }

  const firstSteps: FirstStep[] = [
    { id: "monster", done: !!steps?.monster },
    { id: "friend", done: !!steps?.friend },
    { id: "daily", done: !!steps?.daily },
  ];
  // Al completarlos desaparecen (y salta el aviso del logro); antes, solo con la X.
  const showFirstSteps =
    !!profile &&
    !!steps &&
    !profile.first_steps_dismissed &&
    isNewAccount(profile.created_at) &&
    firstSteps.some((step) => !step.done);

  return (
    <>
      <section className="flex flex-wrap items-center gap-6">
        <Link href="/perfil" className="grid size-28 shrink-0 place-items-center rounded-[1.75rem] bg-surface shadow-soft">
          <Avatar seed={viewer.avatar_seed} parts={viewer.avatar_parts} size={96} label={m.home.yourMonster} />
        </Link>
        <div className="flex min-w-60 flex-1 flex-col gap-4">
          <h1 className="display text-5xl font-bold sm:text-6xl">
            {m.home.hello(viewer.username)}
            {viewer.supporter_tier && (
              <span title={m.common.supporter} className="ml-2 align-top text-2xl" style={{ color: "var(--t256)" }}>
                ✦
              </span>
            )}
          </h1>
          <LevelBar xp={viewer.xp} className="max-w-sm" />
        </div>
      </section>

      <Suspense fallback={<div className="mt-8 h-28" />}>
        <QuickGames viewerId={viewer.id} />
      </Suspense>

      <Suspense fallback={null}>
        <div className="mt-6 empty:hidden">
          <LatestNews viewerId={viewer.id} />
        </div>
      </Suspense>

      {showFirstSteps && <FirstSteps viewerId={viewer.id} steps={firstSteps} />}

      {/* Hoy: la racha en grande y los retos del día. */}
      {streak && (
        <div className="mt-10 flex flex-col gap-6">
          <StreakHero streak={streak} compact />
          <DailyCards cards={(dailies ?? []).map(toCard)} />
        </div>
      )}

      <div className="mt-12">
        <NowSection items={now} waiting={waiting} />
      </div>
    </>
  );
}

const toCard = (row: Functions<"get_my_dailies">["Returns"][number]): DailyCardData => ({
  slot: row.slot as DailyCardData["slot"],
  game: row.game,
  status: row.status,
  score: row.score,
  rank: row.rank,
  players: row.players,
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const isNewAccount = (createdAt: string) => new Date(createdAt).getTime() > Date.now() - FIRST_STEPS_DAYS * 24 * 60 * 60 * 1000;
