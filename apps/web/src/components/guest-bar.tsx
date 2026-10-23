"use client";

import Link from "next/link";
import { signupHref } from "@/lib/signup";
import { useMessages, usePagePath } from "@/lib/i18n/client";

/**
 * En el móvil, para quien no ha iniciado sesión: una barra abajo (donde los
 * registrados tienen las pestañas) que invita a crear la cuenta. Fuera de la
 * pantalla de entrar, que ya es eso.
 */
export function GuestBar() {
  const pathname = usePagePath();
  const m = useMessages();
  if (pathname.startsWith("/entrar") || pathname === "/cuenta-borrada") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden">
      <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-full bg-surface py-2 pr-2 pl-5 shadow-lift">
        <span className="text-sm font-medium">{m.guest.noAccountYet}</span>
        <Link href={signupHref(pathname)} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold whitespace-nowrap text-bg">
          {m.common.signUpFree}
        </Link>
      </div>
    </div>
  );
}
