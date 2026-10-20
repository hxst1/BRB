import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { brand } from "@repo/brand";
import { Avatar } from "@repo/ui/avatar";
import { checkoutUrl } from "@/lib/lemonsqueezy";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "Apoyar",
  description: `Ayuda a mantener ${brand.name} y consigue partes exclusivas para tu monstruo.`,
};

const PERKS = [
  { title: "Corona", detail: "Para el monstruo que se lo merece." },
  { title: "Paleta dorada", detail: "Que se note en el ranking." },
  { title: "Paleta nocturna", detail: "Para los que juegan de madrugada." },
  { title: "Insignia ✦", detail: "Junto a tu nombre en rankings y perfil." },
];

export default function SupportPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6">
      <h1 className="display mb-3 text-5xl font-bold text-balance sm:text-6xl">Apoya {brand.name}</h1>
      <p className="mb-10 max-w-lg text-lg text-muted">
        Lo hacemos por gusto y sin anuncios. Si te entretiene, puedes ayudar a mantenerlo. A cambio, tu monstruo estrena
        ropa: solo cosméticos, nunca ventajas en las partidas.
      </p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-line/40" />}>
        <SupportForViewer />
      </Suspense>
    </main>
  );
}

async function SupportForViewer() {
  const viewer = await getViewer();
  const checkout = process.env.NEXT_PUBLIC_SUPPORTER_CHECKOUT_URL;
  const seed = viewer?.avatar_seed ?? 7;
  const parts = viewer?.avatar_parts ?? {};

  return (
    <div className="flex flex-col gap-10">
      {/* Tu propio monstruo con las partes exclusivas */}
      <div className="flex items-end justify-center gap-4 rounded-3xl bg-surface p-6 shadow-soft">
        <Avatar seed={seed} parts={{ ...(parts as object), top: "crown" }} size={88} />
        <Avatar seed={seed} parts={{ ...(parts as object), palette: "gold", top: "crown" }} size={120} mood="happy" />
        <Avatar seed={seed} parts={{ ...(parts as object), palette: "night" }} size={88} />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {PERKS.map((perk) => (
          <li key={perk.title} className="rounded-2xl border border-line p-4">
            <p className="font-semibold">{perk.title}</p>
            <p className="text-sm text-muted">{perk.detail}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-start gap-2">
        {viewer?.supporter_tier ? (
          <>
            <p className="display text-3xl font-bold">¡Gracias! Ya apoyas el proyecto ✦</p>
            <Link href="/perfil" className="font-medium underline underline-offset-4">
              Ponle la corona a tu monstruo
            </Link>
          </>
        ) : !checkout ? (
          <>
            <button type="button" disabled className="rounded-full bg-ink px-6 py-3 font-semibold text-bg opacity-40">
              Apoyar
            </button>
            <p className="text-sm text-muted">Muy pronto podrás apoyar desde aquí.</p>
          </>
        ) : viewer ? (
          <>
            <a href={checkoutUrl(checkout, viewer.id)} className="rounded-full bg-ink px-6 py-3 font-semibold text-bg">
              Apoyar
            </a>
            <p className="text-sm text-muted">El pago lo gestiona Lemon Squeezy. Al completarlo, las partes se desbloquean solas.</p>
          </>
        ) : (
          <Link href="/entrar?next=/apoyar" className="rounded-full bg-ink px-6 py-3 font-semibold text-bg">
            Entra para apoyar
          </Link>
        )}
      </div>
    </div>
  );
}
