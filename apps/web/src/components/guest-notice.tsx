"use client";

import Link from "next/link";
import { signupHref } from "@/lib/signup";
import { useMessages } from "@/lib/i18n/client";

/** Debajo de cada juego, para quien juega sin cuenta: crear una (gratis) para guardar sus partidas. */
export function GuestNotice({ next }: { next: string }) {
  const m = useMessages();
  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--cell)" }}>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">{m.guest.playingAsGuest}</p>
        <p className="text-sm text-muted">{m.guest.playingAsGuestHint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href={signupHref(next)} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          {m.common.signUp}
        </Link>
        <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {m.common.signIn}
        </Link>
      </div>
    </div>
  );
}
