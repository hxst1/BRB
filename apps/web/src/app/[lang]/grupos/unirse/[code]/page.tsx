import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { brand } from "@repo/brand";
import { JoinGroup } from "@/components/groups/join-group";
import { getMessages } from "@/lib/i18n/server";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getViewerId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Caben 50 personas por grupo (private.group_limits). */
const MAX_MEMBERS = 50;

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.groups.join.metaTitle, robots: PRIVATE_PAGE };
}

/** Invitación a un grupo: su nombre, cuánta gente hay y el botón para entrar. */
export default function JoinGroupPage({ params }: PageProps<"/[lang]/grupos/unirse/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pt-6 pb-24 text-center">
      <Suspense fallback={<div className="h-72 w-full animate-pulse rounded-3xl bg-line/40" />}>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: Pick<PageProps<"/[lang]/grupos/unirse/[code]">, "params">) {
  const [{ code }, m, viewerId] = await Promise.all([params, getMessages(), getViewerId()]);
  const clean = code.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  const supabase = await createClient();
  const { data: group } = await supabase.rpc("get_group_invite", { code: clean }).maybeSingle();

  if (!group) {
    return (
      <>
        <h1 className="display text-4xl font-bold text-balance">{m.groups.join.notFound}</h1>
        <Link href="/" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          {m.common.backHome}
        </Link>
      </>
    );
  }
  if (group.joined) redirect(`/grupos/${group.id}`);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="display text-5xl font-bold text-balance break-words">{m.groups.join.title(group.name)}</h1>
        <p className="text-muted text-balance">{m.groups.join.body(brand.name)}</p>
        <p className="text-sm text-muted">{m.groups.members(group.members)}</p>
      </div>
      {group.members >= MAX_MEMBERS ? (
        <p className="text-danger">{m.groups.join.full}</p>
      ) : viewerId ? (
        <JoinGroup code={clean} />
      ) : (
        <Link
          href={`/entrar?next=${encodeURIComponent(`/grupos/unirse/${clean}`)}`}
          className="rounded-full bg-ink px-6 py-3 font-semibold text-bg"
        >
          {m.groups.join.signIn}
        </Link>
      )}
    </>
  );
}
