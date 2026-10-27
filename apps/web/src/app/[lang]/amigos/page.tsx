import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FriendCode } from "@/components/profile/friend-code";
import { Friends } from "@/components/profile/friends";
import { FriendsPageSkeleton } from "@/components/profile/friends-skeleton";
import { MyGroups } from "@/components/groups/my-groups";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.nav.friends, robots: PRIVATE_PAGE };
}

export default async function FriendsPage({ searchParams }: PageProps<"/[lang]/amigos">) {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-8 text-5xl font-bold sm:text-6xl">{m.nav.friends}</h1>
      <Suspense fallback={<FriendsPageSkeleton />}>
        <FriendsForViewer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FriendsForViewer({ searchParams }: { searchParams: PageProps<"/[lang]/amigos">["searchParams"] }) {
  const { codigo } = await searchParams;
  // Solo caracteres válidos de un código: el resto se descarta.
  const invite = typeof codigo === "string" ? codigo.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 5) : "";

  const viewerId = await getViewerId();
  if (!viewerId) {
    redirect(`/entrar?next=${encodeURIComponent(invite ? `/amigos?codigo=${invite}` : "/amigos")}`);
  }

  const supabase = await createClient();
  const [{ data: friendCode }, { data: groups }] = await Promise.all([
    supabase.from("friend_codes").select("code").eq("user_id", viewerId).single(),
    supabase.from("groups").select("id, name, group_members(count)").order("created_at"),
  ]);

  return (
    // En el móvil, los grupos van después de la lista de amigos; en escritorio, bajo tu código.
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16">
      <div>{friendCode && <FriendCode code={friendCode.code} />}</div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <Friends viewerId={viewerId} initialCode={invite === friendCode?.code ? "" : invite} />
      </div>
      <MyGroups groups={(groups ?? []).map((group) => ({ id: group.id, name: group.name, members: group.group_members[0]?.count ?? 0 }))} />
    </div>
  );
}
