import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DailyGame, DailyLeaderboard } from "@/components/daily/daily-game";
import { DailyResult, NextGame, StreakText, formatDay } from "@/components/daily/daily-summary";
import { Game2048Screen } from "@/components/game2048/screen";
import { DAILY_GAMES, dailyGameName } from "@/lib/daily";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reto diario: un minijuego distinto cada día",
  description:
    "Cada día, la misma partida para todo el mundo y un solo intento: 2048, Snake, Buscaminas, Lights Out o Sudoku según el día. Juega gratis y mantén tu racha.",
  alternates: { canonical: "/reto-diario" },
};

export default function DailyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="board mx-auto max-w-[30rem] animate-pulse lg:mx-0" />}>
        <DailyForViewer />
      </Suspense>
    </main>
  );
}

function Heading({ game }: { game: string }) {
  return (
    <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Reto diario</h1>
      <p className="mb-8 text-muted">
        Hoy toca <strong className="text-ink">{dailyGameName(game)}</strong>. La misma partida para todos, un solo intento.
      </p>
    </div>
  );
}

async function DailyForViewer() {
  const viewerId = await getViewerId();
  const supabase = await createClient();

  if (!viewerId) {
    const { data: info } = await supabase.rpc("get_daily_info").maybeSingle();
    const game = info?.game ?? "2048";
    return (
      <>
        <Heading game={game} />
        <Layout aside={<DailyLeaderboard game={game} viewerId={null} />}>
          <p>
            <Link href="/entrar?next=/reto-diario" className="font-medium underline underline-offset-4">
              Entra
            </Link>{" "}
            para jugar el reto de hoy y aparecer en el ranking.
          </p>
          {info && <NextGame summary={info} />}
        </Layout>
      </>
    );
  }

  const { data: summary } = await supabase.rpc("get_my_daily").maybeSingle();
  const game = summary?.game ?? "2048";

  // Con el intento en curso se sigue mostrando el juego: la página se refresca
  // sola (LiveRefresh) cuando llega un mensaje o un reto, y cambiar de vista
  // desmontaría la partida a medias. Al volver más tarde, start_daily_run ya no
  // la devuelve y el juego avisa de que el intento está usado.
  if (!summary || summary.status === "available" || summary.status === "playing") {
    return (
      <>
        <Heading game={game} />
        {game === "2048" ? (
          <Game2048Screen viewerId={viewerId} challenge={null} daily />
        ) : (
          <DailyGame game={game} day={summary?.day ?? ""} viewerId={viewerId} />
        )}
      </>
    );
  }

  return (
    <>
      <Heading game={game} />
      <Layout aside={<DailyLeaderboard game={game} viewerId={viewerId} />}>
        <p className="text-sm text-muted first-letter:uppercase">{formatDay(summary.day)}</p>
        <p className="display text-3xl font-bold text-balance">
          <DailyResult summary={summary} />
        </p>
        <p>
          <StreakText summary={summary} />
        </p>
        <NextGame summary={summary} />
        <Link href={DAILY_GAMES[game]?.path ?? "/"} className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          Jugar una partida normal
        </Link>
      </Layout>
    </>
  );
}

function Layout({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[30rem] gap-12 lg:max-w-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <section className="flex flex-col gap-4">{children}</section>
      {aside}
    </div>
  );
}
