import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@repo/ui/avatar";
import { InviteStart } from "@/components/guest/invite-start";
import { inviteGame } from "@/lib/guest";
import { getMessages } from "@/lib/i18n/server";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.invite.metaTitle, robots: PRIVATE_PAGE };
}

/**
 * Invitación a jugar (a ella lleva /invita/<código>): quién te reta y, sin
 * cuenta, jugar al momento como invitado. Con cuenta, retarle directamente.
 */
export default function JoinPage({ params, searchParams }: PageProps<"/[lang]/unete/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pt-6 pb-24 text-center">
      <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-3xl bg-line/40" />}>
        <Invite params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Invite({ params, searchParams }: Pick<PageProps<"/[lang]/unete/[code]">, "params" | "searchParams">) {
  const [{ code }, { juego }, m, viewerId] = await Promise.all([params, searchParams, getMessages(), getViewerId()]);
  const supabase = await createClient();
  const clean = code.trim().toUpperCase();
  const { data: inviter } = await supabase.rpc("get_invite", { code: clean }).maybeSingle();

  if (!inviter) {
    return (
      <>
        <h1 className="display text-4xl font-bold">{m.invite.notFound}</h1>
        <Link href="/" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          {m.common.backHome}
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="grid size-32 place-items-center rounded-[2rem] bg-surface shadow-soft">
        <Avatar seed={inviter.avatar_seed} parts={inviter.avatar_parts} size={112} mood="happy" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="display text-5xl font-bold text-balance">{m.invite.title(inviter.username)}</h1>
        <p className="text-muted text-balance">{viewerId ? m.invite.bodySignedIn(inviter.username) : m.invite.body(inviter.username)}</p>
      </div>
      <InviteStart code={clean} inviter={inviter.username} initialGame={inviteGame(juego)} signedIn={viewerId !== null} />
    </>
  );
}
