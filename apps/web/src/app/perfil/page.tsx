import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/entrar/actions";
import { LevelBar } from "@/components/level-bar";
import { AppSettings } from "@/components/pwa/app-settings";
import { FeedbackSection } from "@/components/feedback/feedback-section";
import { Achievements } from "@/components/profile/achievements";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Tu perfil", robots: PRIVATE_PAGE };

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
  const [{ data: achievements }, { data: feedback }] = await Promise.all([
    supabase.rpc("get_my_achievements"),
    supabase
      .from("feedback")
      .select("id, kind, body, rating, status, admin_reply, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const unlocked = (achievements ?? []).filter((a) => a.unlocked_at).map((a) => a.achievement);

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <div>
        <h1 className="display mb-3 text-5xl font-bold sm:text-6xl">
          {viewer.username}
          {viewer.supporter_tier && (
            <span title="Apoya el proyecto" className="ml-2 align-top text-2xl" style={{ color: "var(--t256)" }}>
              ✦
            </span>
          )}
        </h1>
        <LevelBar xp={viewer.xp} className="max-w-sm" />
      </div>

      <AvatarEditor
        // Si el avatar cambia fuera del editor (p. ej. al estrenar un logro), empieza de nuevo con el guardado.
        key={`${viewer.avatar_seed}:${JSON.stringify(viewer.avatar_parts)}`}
        userId={viewer.id}
        initialSeed={viewer.avatar_seed}
        initialParts={viewer.avatar_parts}
        isSupporter={viewer.supporter_tier !== null}
        unlocked={unlocked}
      />

      <Achievements statuses={achievements ?? []} avatarSeed={viewer.avatar_seed} avatarParts={viewer.avatar_parts} />

      <AppSettings />

      <FeedbackSection items={feedback ?? []} />

      <section aria-label="Cuenta" className="flex flex-col gap-3 border-t border-line pt-6">
        <Link href="/amigos" className="text-sm font-medium underline-offset-4 hover:underline">
          Amigos y código de invitación
        </Link>
        <Link href="/apoyar" className="text-sm font-medium underline-offset-4 hover:underline">
          {viewer.supporter_tier ? "Gracias por apoyar ✦" : "Apoyar el proyecto"}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-2 text-sm text-danger transition-colors hover:border-danger"
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
