import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { brand } from "@repo/brand";
import { Avatar } from "@repo/ui/avatar";
import { Bone } from "@/components/skeleton";
import { SupportOptions } from "@/components/support/support-options";
import { WhereItGoes } from "@/components/support/where-it-goes";
import { getViewer } from "@/lib/session";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    title: m.meta.supportTitle,
    description: m.meta.supportDescription(brand.name),
    alternates: alternatesFor("/apoyar", locale),
  };
}

export default async function SupportPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-3 text-5xl font-bold text-balance sm:text-6xl">{m.support.title(brand.name)}</h1>
      <p className="mb-10 max-w-lg text-lg text-muted">
        {m.support.pageIntro}
      </p>
      <Suspense fallback={<SupportSkeleton />}>
        <SupportForViewer />
      </Suspense>
    </main>
  );
}

/**
 * Mientras se sabe quién mira: lo mismo que llega (casi todo es fijo), con
 * los tres monstruos en gris; los tuyos llegan con tu sesión.
 */
async function SupportSkeleton() {
  const m = await getMessages();
  return (
    <div aria-hidden inert className="flex flex-col gap-10">
      <div className="flex items-end justify-center gap-4 rounded-3xl bg-surface p-6 shadow-soft">
        <Bone className="size-[88px] rounded-full" />
        <Bone className="size-[120px] rounded-full" />
        <Bone className="size-[88px] rounded-full" />
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {m.support.perks.map((perk) => (
          <li key={perk.title} className="rounded-2xl border border-line p-4">
            <p className="font-semibold">{perk.title}</p>
            <p className="text-sm text-muted">{perk.detail}</p>
          </li>
        ))}
      </ul>
      <WhereItGoes />
      <SupportOptions />
    </div>
  );
}

async function SupportForViewer() {
  const [viewer, m] = await Promise.all([getViewer(), getMessages()]);
  const seed = viewer?.avatar_seed ?? 7;
  const parts = viewer?.avatar_parts ?? {};

  return (
    <div className="flex flex-col gap-10">
      {/* Tu propio monster con las partes exclusivas */}
      <div className="flex items-end justify-center gap-4 rounded-3xl bg-surface p-6 shadow-soft">
        <Avatar seed={seed} parts={{ ...(parts as object), palette: "galaxy", top: "sunglasses" }} size={88} />
        <Avatar seed={seed} parts={{ ...(parts as object), palette: "rainbow", top: "crown" }} size={120} mood="happy" />
        <Avatar seed={seed} parts={{ ...(parts as object), palette: "gold", top: "sunglasses" }} size={88} />
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {m.support.perks.map((perk) => (
          <li key={perk.title} className="rounded-2xl border border-line p-4">
            <p className="font-semibold">{perk.title}</p>
            <p className="text-sm text-muted">{perk.detail}</p>
          </li>
        ))}
      </ul>

      <WhereItGoes />

      {viewer?.supporter_tier ? (
        <div className="flex flex-col items-start gap-2">
          <p className="display text-3xl font-bold">{m.support.thanks}</p>
          <Link href="/perfil" className="font-medium underline underline-offset-4">
            {m.support.wearCrown}
          </Link>
        </div>
      ) : (
        <SupportOptions />
      )}
    </div>
  );
}
