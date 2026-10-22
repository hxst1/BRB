import Link from "next/link";
import { Suspense } from "react";
import { brand } from "@repo/brand";
import { AchievementToaster } from "@/components/achievements/achievement-toaster";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { LiveRefresh } from "@/components/live-refresh";
import { PresenceReporter } from "@/components/presence-reporter";
import { SupportButton } from "@/components/support/support-button";
import { AccountMenu } from "@/components/nav/account-menu";
import { MainNav } from "@/components/nav/main-nav";
import type { NavCounts } from "@/components/nav/nav-items";
import { TabBar } from "@/components/nav/tab-bar";
import { getViewer, getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Avisos de cada sección: lo pendiente en Inicio, los mensajes en Chat y las solicitudes en Amigos. */
async function getNavCounts(): Promise<NavCounts> {
  const supabase = await createClient();
  const [{ data: pending }, { data: unread }] = await Promise.all([
    supabase.rpc("get_pending_counts").maybeSingle(),
    supabase.rpc("get_unread_messages"),
  ]);
  return {
    home: pending ? pending.my_turn + pending.match_invites + pending.challenges : 0,
    chat: unread ?? 0,
    friends: pending?.friend_requests ?? 0,
  };
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-1.5">
        <Link href="/" className="display text-2xl font-bold">
          {brand.name}
        </Link>
        <SupportButton />
      </div>
      <Suspense fallback={<span className="h-9 w-24" />}>
        <Navigation />
      </Suspense>
    </header>
  );
}

async function Navigation() {
  // Sin sesión no hay nada que pedir; con ella, perfil y avisos a la vez.
  const [viewer, counts] = (await getViewerId()) ? await Promise.all([getViewer(), getNavCounts()]) : [null, null];

  if (!viewer || !counts) {
    return (
      <Link href="/entrar" className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-bg">
        Entrar
      </Link>
    );
  }

  return (
    <>
      <LiveRefresh viewerId={viewer.id} />
      <PresenceReporter />
      <FeedbackDialog />
      <AchievementToaster viewerId={viewer.id} avatarSeed={viewer.avatar_seed} avatarParts={viewer.avatar_parts} />
      <div className="flex items-center gap-3">
        <MainNav counts={counts} />
        <AccountMenu
          username={viewer.username}
          avatarSeed={viewer.avatar_seed}
          avatarParts={viewer.avatar_parts}
          xp={viewer.xp}
        />
      </div>
      <TabBar counts={counts} avatarSeed={viewer.avatar_seed} avatarParts={viewer.avatar_parts} />
    </>
  );
}
