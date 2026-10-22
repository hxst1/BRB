import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { AuthForm } from "./auth-form";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Entrar", robots: PRIVATE_PAGE };

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-24">
      <Suspense>
        <AuthFormForRequest searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * `next` se lee en el servidor para que ya venga en el HTML: si alguien envía
 * el formulario antes de que cargue el JavaScript, vuelve igualmente a donde estaba.
 */
async function AuthFormForRequest({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { next, modo } = await searchParams;
  // /entrar?modo=registro abre directamente "Crear cuenta" (los botones de registro de la portada y los juegos).
  return <AuthForm next={safeNext(next)} initialMode={modo === "registro" ? "signup" : "signin"} />;
}
