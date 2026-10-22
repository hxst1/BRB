import type { Metadata } from "next";
import Link from "next/link";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Cuenta borrada", robots: PRIVATE_PAGE };

export default function DeletedAccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 pt-10 pb-16 sm:px-6">
      <h1 className="display text-5xl font-bold">Cuenta borrada</h1>
      <p className="text-muted">Tu cuenta y todos tus datos se han borrado. Gracias por haber jugado. Si algún día vuelves, aquí estaremos.</p>
      <Link href="/" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        Volver al inicio
      </Link>
    </main>
  );
}
