import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { FriendCode } from "@/components/profile/friend-code";
import { Friends } from "@/components/profile/friends";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tu perfil" };

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" />}>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Profile() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/perfil");

  const supabase = await createClient();
  const { data: friendCode } = await supabase.from("friend_codes").select("code").eq("user_id", viewer.id).single();

  return (
    <>
      <h1 className="display mb-1 text-6xl font-bold sm:text-7xl">{viewer.username}</h1>
      <p className="mb-10 text-muted">Nivel {1 + Math.floor(Math.sqrt(viewer.xp / 10))} · {viewer.xp} XP</p>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
        <AvatarEditor
          userId={viewer.id}
          initialSeed={viewer.avatar_seed}
          initialParts={viewer.avatar_parts}
          isSupporter={viewer.supporter_tier !== null}
        />
        <div className="flex flex-col gap-12">
          {friendCode && <FriendCode code={friendCode.code} />}
          <Friends viewerId={viewer.id} />
        </div>
      </div>
    </>
  );
}
