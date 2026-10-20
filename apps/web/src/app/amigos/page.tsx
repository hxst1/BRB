import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FriendCode } from "@/components/profile/friend-code";
import { Friends } from "@/components/profile/friends";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Amigos" };

export default function FriendsPage({ searchParams }: PageProps<"/amigos">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-8 text-5xl font-bold sm:text-6xl">Amigos</h1>
      <Suspense fallback={<div className="h-48 max-w-md animate-pulse rounded-3xl bg-line/40" />}>
        <FriendsForViewer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FriendsForViewer({ searchParams }: { searchParams: PageProps<"/amigos">["searchParams"] }) {
  const { codigo } = await searchParams;
  // Solo caracteres válidos de un código: el resto se descarta.
  const invite = typeof codigo === "string" ? codigo.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 5) : "";

  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/entrar?next=${encodeURIComponent(invite ? `/amigos?codigo=${invite}` : "/amigos")}`);
  }

  const supabase = await createClient();
  const { data: friendCode } = await supabase.from("friend_codes").select("code").eq("user_id", viewer.id).single();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
      <div>{friendCode && <FriendCode code={friendCode.code} />}</div>
      <Friends viewerId={viewer.id} initialCode={invite === friendCode?.code ? "" : invite} />
    </div>
  );
}
