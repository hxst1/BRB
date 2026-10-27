import type { Metadata } from "next";
import Link from "next/link";
import type { DailyStatus } from "@repo/db";
import { DailyCards, type DailyCardData } from "@/components/daily/daily-cards";
import { DailyGame, DailyLeaderboard } from "@/components/daily/daily-game";
import { DailyPageSkeleton } from "@/components/daily/daily-page-skeleton";
import { Loading } from "@/components/skeleton";
import { Game2048Screen } from "@/components/game2048/screen";
import { HowToPlayButton } from "@/components/how-to-play";
import { StreakHero } from "@/components/streak/streak-hero";
import { DAILY_GAMES, dailyGameName, formatDailyScore, gameDay, type DailySlot } from "@/lib/daily";
import type { Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";
import { getViewerId } from "@/lib/session";
import { recentDays } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    title: m.meta.dailyTitle,
    description: m.meta.dailyDescription,
    alternates: alternatesFor("/reto-diario", locale),
  };
}

/** Retos que se juegan aquí (el Wordle y el duelo tienen su propia página). */
const PLAYABLE = ["puzzle", "arcade"] as const;

const toCard = (row: Pick<DailyStatus, "slot" | "game"> & Partial<DailyStatus>): DailyCardData => ({
  slot: row.slot as DailySlot,
  game: row.game,
  status: row.status ?? null,
  score: row.score ?? null,
  rank: row.rank ?? null,
  players: row.players ?? null,
});

export default function DailyPage({ searchParams }: PageProps<"/[lang]/reto-diario">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      {/* Sin fundido: el esqueleto ya enseña el título y la entradilla, que parpadearían. */}
      <Loading skeleton={<DailyPageSkeleton />} fade={false}>
        <DailyForViewer searchParams={searchParams} />
      </Loading>
    </main>
  );
}

async function DailyForViewer({ searchParams }: { searchParams: PageProps<"/[lang]/reto-diario">["searchParams"] }) {
  const [{ reto, empezar }, viewerId, m] = await Promise.all([searchParams, getViewerId(), getMessages()]);
  // Después de getViewerId: la sesión de la petición ya está leída (el cliente usa Date.now()).
  const supabase = await createClient();

  if (!viewerId) {
    const { data: challenges } = await supabase.rpc("get_daily_challenges");
    const cards = [...(challenges ?? []).map(toCard), toCard({ slot: "wordle", game: "wordle" })];
    const arcade = challenges?.find((challenge) => challenge.slot === "arcade")?.game ?? "2048";
    return (
      <>
        <Title m={m} />
        <DailyCards cards={cards} title={false} />
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
          <p>
            <Link href="/entrar?next=/reto-diario" className="font-medium underline underline-offset-4">
              {m.daily.signIn}
            </Link>{" "}
            {m.daily.signInRest}
          </p>
          <DailyLeaderboard game={arcade} viewerId={null} />
        </div>
      </>
    );
  }

  const [{ data: streak }, { data: dailies }] = await Promise.all([supabase.rpc("get_my_streak").maybeSingle(), supabase.rpc("get_my_dailies")]);
  const playable = (dailies ?? []).filter((row) => (PLAYABLE as readonly string[]).includes(row.slot));
  // El que se pide, o el primero que quede por jugar.
  const current =
    playable.find((row) => row.slot === reto) ??
    playable.find((row) => row.status === "available" || row.status === "playing") ??
    playable[0];
  const day = recentDays(streak?.recent).at(-1)?.day ?? gameDay();

  return (
    <>
      <Title m={m} />
      <div className="flex flex-col gap-6">
        {streak && <StreakHero streak={streak} />}
        <DailyCards cards={(dailies ?? []).map(toCard)} selected={current?.slot as DailySlot | undefined} />
      </div>
      {current && <Challenge row={current} day={day} viewerId={viewerId} m={m} start={empezar === "1"} />}
    </>
  );
}

async function Title({ m }: { m: Messages }) {
  return (
    <div className="mb-6">
      <h1 className="display text-6xl font-bold sm:text-7xl">{m.daily.title}</h1>
      <p className="text-muted">{m.daily.intro}</p>
    </div>
  );
}

/** El reto elegido: el juego si queda por jugar, o el resultado con el ranking del día. */
/** `start`: se ha pedido empezar (el intento se gasta al empezar: nunca empieza solo al abrir la página). */
async function Challenge({ row, day, viewerId, m, start }: { row: DailyStatus; day: string; viewerId: string; m: Messages; start: boolean }) {
  const locale = await getLocale();
  const game = row.game;
  // Con el intento en curso se sigue mostrando el juego: la página se refresca
  // sola (LiveRefresh) cuando llega un mensaje o un reto, y cambiar de vista
  // desmontaría la partida a medias. Al volver más tarde, start_daily_run ya no
  // la devuelve y el juego avisa de que el intento está usado.
  const playing = row.status === "playing" || (row.status === "available" && start);

  return (
    <section id="jugar" aria-labelledby="challenge-title" className="mt-12 scroll-mt-24">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="challenge-title" className="display text-4xl font-bold">
          <span className="block text-base font-semibold text-muted">{m.dailies.slots[row.slot as DailySlot]}</span>
          {dailyGameName(game, m)}
        </h2>
        {DAILY_GAMES[game] && <HowToPlayButton game={DAILY_GAMES[game].guide} name={dailyGameName(game, m, true)} />}
      </div>
      {row.status === "available" && !start ? (
        <div className="flex max-w-xl flex-col items-start gap-4 rounded-3xl bg-surface p-5 shadow-soft">
          <p>{m.daily.ready}</p>
          <Link href={`/reto-diario?reto=${row.slot}&empezar=1#jugar`} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
            {m.daily.start}
          </Link>
        </div>
      ) : playing ? (
        game === "2048" ? (
          <Game2048Screen viewerId={viewerId} challenge={null} daily />
        ) : (
          <DailyGame key={game} game={game} day={day} viewerId={viewerId} />
        )
      ) : (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col gap-4">
            <p className="display text-3xl font-bold text-balance">
              {row.status === "finished" && row.score !== null ? (
                <>
                  {DAILY_GAMES[game]?.time ? m.daily.todayTook : m.daily.todayScored}
                  <span className="tabular">{formatDailyScore(game, row.score, m)}</span>
                  {row.rank && row.players ? <>: {m.daily.rank(row.rank, row.players)}</> : null}
                  {m.common.period}
                </>
              ) : (
                m.daily.used
              )}
            </p>
            <p className="text-sm text-muted">{new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "Europe/Madrid" }).format(new Date())}</p>
            <Link href={DAILY_GAMES[game]?.path ?? "/"} className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
              {m.daily.playNormal}
            </Link>
          </div>
          <DailyLeaderboard game={game} viewerId={viewerId} />
        </div>
      )}
    </section>
  );
}
