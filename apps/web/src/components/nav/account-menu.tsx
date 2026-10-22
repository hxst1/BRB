"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Json } from "@repo/db";
import { signOut } from "@/app/entrar/actions";
import { Avatar } from "@repo/ui/avatar";
import { showFeedback } from "@/components/feedback/feedback-dialog";
import { LevelBar } from "@/components/level-bar";

/**
 * Menú de la cuenta en escritorio. "Salir" vive aquí dentro, separado del
 * resto, para que no se pulse sin querer.
 */
export function AccountMenu({
  username,
  avatarSeed,
  avatarParts,
  xp,
}: {
  username: string;
  avatarSeed: number;
  avatarParts: Json;
  xp: number;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Se cierra al navegar, al pulsar fuera o con Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative hidden sm:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 text-sm font-medium shadow-soft transition-shadow hover:shadow-lift"
      >
        <Avatar seed={avatarSeed} parts={avatarParts} size={32} />
        {username}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-64 rounded-3xl bg-surface p-2 shadow-lift">
          <div className="flex items-center gap-3 p-2">
            <Avatar seed={avatarSeed} parts={avatarParts} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{username}</p>
              <LevelBar xp={xp} compact />
            </div>
          </div>
          <MenuLink href="/perfil">Tu perfil y tu monstruo</MenuLink>
          <MenuLink href="/amigos">Amigos y código de invitación</MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              showFeedback("bug");
            }}
            className="w-full rounded-2xl px-3 py-2 text-left text-sm hover:bg-bg"
          >
            Reportar un problema o sugerir algo
          </button>
          <div className="my-1.5 border-t border-line" />
          <form action={signOut}>
            <button type="submit" role="menuitem" className="w-full rounded-2xl px-3 py-2 text-left text-sm text-danger hover:bg-bg">
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="block rounded-2xl px-3 py-2 text-sm hover:bg-bg">
      {children}
    </Link>
  );
}
