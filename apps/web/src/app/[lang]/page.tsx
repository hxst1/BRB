import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/home/dashboard";
import { DashboardSkeleton, HomeSkeleton } from "@/components/home/dashboard-skeleton";
import { Loading } from "@/components/skeleton";
import { Landing } from "@/components/home/landing";
import { getViewer } from "@/lib/session";
import { getLocale } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternatesFor("/", await getLocale()) };
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6">
      {/* Sin fundido: lo que llega primero suele ser el esqueleto del panel, igual que este. */}
      <Suspense fallback={<HomeSkeleton />}>
        <HomeForViewer />
      </Suspense>
    </main>
  );
}

/** Con sesión, la portada es tu panel; sin ella, la presentación. */
async function HomeForViewer() {
  const viewer = await getViewer();
  // Sin fundido: el esqueleto ya enseña sus mismos textos, y fundirlos los haría parpadear.
  if (!viewer) return <Landing />;
  // El panel hace muchas consultas: mientras, su esqueleto (el de fuera es solo para saber si hay sesión).
  return (
    <Loading skeleton={<DashboardSkeleton />}>
      <Dashboard viewer={viewer} />
    </Loading>
  );
}
