import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/home/dashboard";
import { Landing } from "@/components/home/landing";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6">
      <Suspense fallback={<div className="h-28 max-w-xl animate-pulse rounded-[1.75rem] bg-line/40" />}>
        <HomeForViewer />
      </Suspense>
    </main>
  );
}

/** Con sesión, la portada es tu panel; sin ella, la presentación. */
async function HomeForViewer() {
  const viewer = await getViewer();
  return viewer ? <Dashboard viewer={viewer} /> : <Landing />;
}
