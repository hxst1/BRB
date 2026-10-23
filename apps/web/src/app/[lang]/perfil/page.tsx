import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/[lang]/entrar/actions";
import { FeedbackSection } from "@/components/feedback/feedback-section";
import { LevelBar } from "@/components/level-bar";
import { AccountSettings } from "@/components/profile/account-settings";
import { DeleteAccount } from "@/components/profile/delete-account";
import { Achievements } from "@/components/profile/achievements";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { Records } from "@/components/profile/records";
import { AppSettings } from "@/components/pwa/app-settings";
import { LEGAL_LINKS } from "@/components/site-footer";
import { getViewer, type Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.meta.profile, robots: PRIVATE_PAGE };
}

/** Pestañas del perfil (en la URL: /perfil?seccion=logros). */
const SECTIONS = ["monster", "logros", "records", "ajustes"] as const;
type Section = (typeof SECTIONS)[number];

export default function ProfilePage({ searchParams }: PageProps<"/[lang]/perfil">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Profile({ searchParams }: { searchParams: PageProps<"/[lang]/perfil">["searchParams"] }) {
  const [viewer, m] = await Promise.all([getViewer(), getMessages()]);
  if (!viewer) redirect("/entrar?next=/perfil");
  const { seccion } = await searchParams;
  const section: Section = SECTIONS.find((s) => s === seccion) ?? "monster";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="display mb-3 text-5xl font-bold sm:text-6xl">
          {viewer.username}
          {viewer.supporter_tier && (
            <span title={m.common.supporter} className="ml-2 align-top text-2xl" style={{ color: "var(--t256)" }}>
              ✦
            </span>
          )}
        </h1>
        <LevelBar xp={viewer.xp} className="max-w-sm" />
      </div>

      <nav aria-label={m.profile.sections}>
        <div className="grid grid-flow-col auto-cols-fr rounded-full bg-line/60 p-1">
          {SECTIONS.map((id) => (
            <Link
              key={id}
              href={id === "monster" ? "/perfil" : `/perfil?seccion=${id}`}
              scroll={false}
              aria-current={section === id ? "page" : undefined}
              className={`rounded-full px-1 py-2 text-center text-sm whitespace-nowrap transition-colors sm:px-4 ${
                section === id ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
              }`}
            >
              {m.profile.tabs[id]}
            </Link>
          ))}
        </div>
      </nav>

      {/* Cada pestaña carga solo lo suyo. */}
      <Suspense key={section} fallback={<div className="h-72 animate-pulse rounded-3xl bg-surface" />}>
        {section === "monster" && <MonsterSection viewer={viewer} />}
        {section === "logros" && <AchievementsSection viewer={viewer} />}
        {section === "records" && <Records viewerId={viewer.id} />}
        {section === "ajustes" && <SettingsSection viewer={viewer} />}
      </Suspense>
    </div>
  );
}

async function MonsterSection({ viewer }: { viewer: Viewer }) {
  const { data: achievements } = await (await createClient()).rpc("get_my_achievements");
  const unlocked = (achievements ?? []).filter((a) => a.unlocked_at).map((a) => a.achievement);
  return (
    <AvatarEditor
      userId={viewer.id}
      initialSeed={viewer.avatar_seed}
      initialParts={viewer.avatar_parts}
      isSupporter={viewer.supporter_tier !== null}
      unlocked={unlocked}
    />
  );
}

async function AchievementsSection({ viewer }: { viewer: Viewer }) {
  const { data: achievements } = await (await createClient()).rpc("get_my_achievements");
  return <Achievements statuses={achievements ?? []} avatarSeed={viewer.avatar_seed} avatarParts={viewer.avatar_parts} />;
}

async function SettingsSection({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const m = await getMessages();
  const [{ data: feedback }, { data: friendCode }] = await Promise.all([
    supabase.from("feedback").select("id, kind, body, rating, status, admin_reply, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("friend_codes").select("code").eq("user_id", viewer.id).maybeSingle(),
  ]);

  // En escritorio, dos columnas: la app y los mensajes; tu cuenta, enlaces y borrar la cuenta.
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="flex flex-col gap-8">
        <AppSettings isSupporter={viewer.supporter_tier !== null} />
        <FeedbackSection items={feedback ?? []} />
      </div>

      <div className="flex flex-col gap-8">
        <AccountSettings userId={viewer.id} username={viewer.username} />

        <section aria-label={m.profile.account} className="flex flex-col gap-3 border-t border-line pt-6">
          <Link href="/amigos" className="text-sm font-medium underline-offset-4 hover:underline">
            {m.nav.friendsAndCode}
          </Link>
          <Link href="/apoyar" className="text-sm font-medium underline-offset-4 hover:underline">
            {viewer.supporter_tier ? m.profile.thanksSupport : m.profile.support}
          </Link>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="underline-offset-4 hover:text-ink hover:underline">
                {m.legal[link.label]}
              </Link>
            ))}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 text-sm text-danger transition-colors hover:border-danger"
            >
              {m.nav.signOut}
            </button>
          </form>
        </section>

        <DeleteAccount friendCode={friendCode?.code ?? null} />
      </div>
    </div>
  );
}
