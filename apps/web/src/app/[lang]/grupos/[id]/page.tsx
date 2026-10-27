import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GroupInvite } from "@/components/groups/group-invite";
import { GroupMembers } from "@/components/groups/group-members";
import { GroupSettings } from "@/components/groups/group-settings";
import { GroupSkeleton } from "@/components/groups/group-skeleton";
import { isGroupId } from "@/lib/groups";
import { getMessages } from "@/lib/i18n/server";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.groups.title, robots: PRIVATE_PAGE };
}

/** Un grupo: su ranking, el enlace para invitar, quién está y salir o gestionarlo. */
export default function GroupPage({ params }: PageProps<"/[lang]/grupos/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<GroupSkeleton />}>
        <Group params={params} />
      </Suspense>
    </main>
  );
}

async function Group({ params }: Pick<PageProps<"/[lang]/grupos/[id]">, "params">) {
  const [{ id }, m, viewerId] = await Promise.all([params, getMessages(), getViewerId()]);
  if (!viewerId) redirect(`/entrar?next=${encodeURIComponent(`/grupos/${id}`)}`);

  const supabase = await createClient();
  const [{ data: group }, { data: members }] = isGroupId(id)
    ? await Promise.all([
        supabase.from("groups").select("id, name, code, owner_id").eq("id", id).maybeSingle(),
        supabase
          .from("group_members")
          .select("profile:profiles(id, username, avatar_seed, avatar_parts)")
          .eq("group_id", id)
          .order("joined_at"),
      ])
    : [{ data: null }, { data: null }];

  const back = (
    <Link href="/amigos" className="text-sm text-muted hover:text-ink">
      ← {m.groups.back}
    </Link>
  );

  // Quien no está en el grupo no lo ve (RLS): igual que si no existiera.
  if (!group) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <p className="text-muted">{m.groups.join.notFound}</p>
      </div>
    );
  }

  const people = (members ?? []).map((member) => member.profile);
  const isAdmin = group.owner_id === viewerId;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {back}
        <h1 className="display text-5xl font-bold break-words sm:text-6xl">{group.name}</h1>
        <p className="text-sm text-muted">{m.groups.members(people.length)}</p>
      </div>
      <Link href={`/ranking?grupo=${group.id}`} className="self-start rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.groups.seeRanking}
      </Link>
      <GroupInvite name={group.name} code={group.code} />
      <GroupMembers groupId={group.id} members={people} adminId={group.owner_id} viewerId={viewerId} />
      <GroupSettings key={group.name} groupId={group.id} name={group.name} isAdmin={isAdmin} />
    </div>
  );
}
