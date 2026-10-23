import type { Metadata } from "next";
import { Suspense } from "react";
import { verifyEmailLink } from "../recovery-actions";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.confirmLink.title, robots: PRIVATE_PAGE };
}

/**
 * Paso intermedio de los enlaces de los emails (ver app/auth/confirm): el
 * token se gasta al pulsar el botón, no al abrir la página.
 */
export default function ConfirmLinkPage({ searchParams }: PageProps<"/[lang]/entrar/confirmar">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-24">
      <Suspense>
        <ConfirmForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ConfirmForm({ searchParams }: { searchParams: PageProps<"/[lang]/entrar/confirmar">["searchParams"] }) {
  const m = await getMessages();
  const { token_hash, type, next } = await searchParams;
  const recovery = type === "recovery";
  return (
    <form action={verifyEmailLink} className="flex flex-col gap-4">
      <h1 className="display mb-2 text-4xl font-bold text-balance">{m.confirmLink.title}</h1>
      <p className="-mt-2 text-muted">{recovery ? m.confirmLink.recovery : m.confirmLink.email}</p>
      <input type="hidden" name="token_hash" value={String(token_hash ?? "")} />
      <input type="hidden" name="type" value={String(type ?? "")} />
      <input type="hidden" name="next" value={String(next ?? "/")} />
      <button type="submit" className="rounded-full bg-ink px-5 py-3 font-semibold text-bg">
        {recovery ? m.confirmLink.choosePassword : m.confirmLink.continue}
      </button>
    </form>
  );
}
