import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DailyResult, StreakText, formatDay } from "@/components/daily/daily-summary";
import { Game2048Screen } from "@/components/game2048/screen";
import { Leaderboard } from "@/components/leaderboard";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reto diario",
  description: "La misma partida de 2048 para todos, cada día. Un solo intento.",
};

export default function DailyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-[30rem] lg:mx-0 lg:max-w-none">
        <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">Reto diario</h1>
        <p className="mb-8 text-muted">La misma partida de 2048 para todos, cada día. Un solo intento.</p>
      </div>
      <Suspense fallback={<div className="board mx-auto max-w-[30rem] animate-pulse lg:mx-0" />}>
        <DailyForViewer />
      </Suspense>
    </main>
  );
}

async function DailyForViewer() {
  const viewerId = await getViewerId();

  if (!viewerId) {
    return (
      <Layout aside={<Leaderboard game="2048" daily viewerId={null} refreshKey={0} />}>
        <p>
          <Link href="/entrar?next=/reto-diario" className="font-medium underline underline-offset-4">
            Entra
          </Link>{" "}
          para jugar el reto de hoy y aparecer en el ranking.
        </p>
      </Layout>
    );
  }

  const supabase = await createClient();
  const { data: summary } = await supabase.rpc("get_my_daily").maybeSingle();

  // Un intento empezado no se retoma al volver a la página: cuenta como jugado.
  if (!summary || summary.status === "available") {
    return <Game2048Screen viewerId={viewerId} challenge={null} daily />;
  }

  return (
    <Layout aside={<Leaderboard game="2048" daily viewerId={viewerId} refreshKey={0} />}>
      <p className="text-sm text-muted first-letter:uppercase">{formatDay(summary.day)}</p>
      <p className="display text-3xl font-bold text-balance">
        <DailyResult summary={summary} />
      </p>
      <p>
        <StreakText summary={summary} />
      </p>
      <Link href="/2048" className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        Jugar una partida normal
      </Link>
    </Layout>
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
