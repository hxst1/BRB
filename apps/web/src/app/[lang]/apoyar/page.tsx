import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { brand } from "@repo/brand";
import { Avatar } from "@repo/ui/avatar";
import { SupportOptions } from "@/components/support/support-options";
import { WhereItGoes } from "@/components/support/where-it-goes";
import { getViewer } from "@/lib/session";
import { getMessages } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Apoyar",
  description: `Ayuda a mantener ${brand.name} y consigue partes exclusivas para tu monster.`,
  alternates: { canonical: "/apoyar" },
};

export default async function SupportPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-3 text-5xl font-bold text-balance sm:text-6xl">{m.support.title(brand.name)}</h1>
      <p className="mb-10 max-w-lg text-lg text-muted">
        {m.support.pageIntro}
      </p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-line/40" />}>
        <SupportForViewer />
      </Suspense>
    </main>
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

      <ul className="grid gap-3 sm:grid-cols-2">
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
