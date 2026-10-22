import Link from "next/link";
import { brand } from "@repo/brand";
import { getViewerId } from "@/lib/session";

export const LEGAL_LINKS = [
  { href: "/legal/terminos", label: "Términos" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/cookies", label: "Cookies" },
];

/** Pie con los textos legales, para quien no ha iniciado sesión (con sesión, están en Ajustes). En el móvil deja sitio a la barra de crear cuenta. */
export async function SiteFooter() {
  if (await getViewerId()) return null;
  return (
    <footer className="mx-auto mt-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-line px-4 pt-6 pb-28 text-sm text-muted sm:px-6 sm:pb-6">
      <span>
        {brand.name} · {brand.expansion}
      </span>
      <nav aria-label="Textos legales" className="flex flex-wrap gap-4">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="underline-offset-4 hover:text-ink hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
