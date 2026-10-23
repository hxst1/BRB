import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { INVITE_COOKIE } from "@/lib/invite";
import { safeNext } from "@/lib/safe-next";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthForm } from "./auth-form";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";
import { InlinePicto } from "@/components/picto";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.common.signIn, robots: PRIVATE_PAGE };
}

export default function SignInPage({ searchParams }: PageProps<"/[lang]/entrar">) {
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
async function AuthFormForRequest({ searchParams }: { searchParams: PageProps<"/[lang]/entrar">["searchParams"] }) {
  const { next, modo } = await searchParams;
  const code = (await cookies()).get(INVITE_COOKIE)?.value ?? "";
  const [inviter, m] = await Promise.all([inviterName(code), getMessages()]);
  // /entrar?modo=registro abre directamente "Crear cuenta" (los botones de registro de la portada y los juegos).
  return (
    <>
      {inviter && (
        <p className="mb-4 rounded-2xl p-3 text-sm" style={{ background: "var(--cell)" }}>
          <InlinePicto name="wave" className="mr-1.5" />
          <strong>{inviter}</strong>
          {m.auth.invitedBy}
        </p>
      )}
      <AuthForm next={safeNext(next)} initialMode={modo === "registro" ? "signup" : "signin"} inviteCode={inviter ? code : ""} />
    </>
  );
}

/** Nombre de quien te invitó, si llegaste por su enlace (app/invita/[code]). */
async function inviterName(code: string): Promise<string | null> {
  if (!code) return null;
  const admin = createAdminClient();
  const { data: userId } = await admin.rpc("user_id_by_friend_code", { code });
  if (!userId) return null;
  const { data } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? null;
}
