import Link from "next/link";
import { Suspense } from "react";
import { brand } from "@repo/brand";
import { signOut } from "@/app/entrar/actions";
import { Avatar } from "@/components/avatar";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Partidas en las que te toca, retos y solicitudes de amistad sin responder. */
async function getPendingCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_pending_counts").maybeSingle();
  return data ? data.my_turn + data.match_invites + data.friend_requests : 0;
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
      <Link href="/" className="display text-2xl font-bold">
        {brand.name}
      </Link>
      <Suspense fallback={<span className="h-8 w-24" />}>
        <ViewerMenu />
      </Suspense>
    </header>
  );
}

async function ViewerMenu() {
  const viewer = await getViewer();
  const pending = viewer ? await getPendingCount() : 0;

  if (!viewer) {
    return (
      <Link href="/entrar" className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-bg">
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-5">
      <span className="relative">
        <Link
          href="/perfil"
          className="flex items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1 text-sm font-medium shadow-soft transition-shadow hover:shadow-lift"
        >
          <Avatar seed={viewer.avatar_seed} parts={viewer.avatar_parts} size={32} />
          {viewer.username}
        </Link>
        {pending > 0 && (
          <Link
            href="/"
            aria-label={pending === 1 ? "1 cosa pendiente" : `${pending} cosas pendientes`}
            className="tabular absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-bg"
            style={{ background: "var(--mark-x)" }}
          >
            {pending}
          </Link>
        )}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-muted hover:text-ink"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
