import Link from "next/link";
import { signupHref } from "@/lib/signup";

/** Debajo de cada juego, para quien juega sin cuenta: crear una (gratis) para guardar sus partidas. */
export function GuestNotice({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--cell)" }}>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">Estás jugando sin cuenta</p>
        <p className="text-sm text-muted">Crea una gratis para guardar tus récords, salir en el ranking y retar a tus amigos.</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href={signupHref(next)} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          Crear cuenta
        </Link>
        <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
