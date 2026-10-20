import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/entrar/actions";
import { LevelBar } from "@/components/level-bar";
import { AppSettings } from "@/components/pwa/app-settings";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { getViewer } from "@/lib/session";

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

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <div>
        <h1 className="display mb-3 text-5xl font-bold sm:text-6xl">{viewer.username}</h1>
        <LevelBar xp={viewer.xp} className="max-w-sm" />
      </div>

      <AvatarEditor
        userId={viewer.id}
        initialSeed={viewer.avatar_seed}
        initialParts={viewer.avatar_parts}
        isSupporter={viewer.supporter_tier !== null}
      />

      <AppSettings />

      <section aria-label="Cuenta" className="flex flex-col gap-3 border-t border-line pt-6">
        <Link href="/amigos" className="text-sm font-medium underline-offset-4 hover:underline">
          Amigos y código de invitación
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
