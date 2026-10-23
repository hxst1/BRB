import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/session";
import { NewPasswordForm } from "./new-password-form";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.recover.newTitle, robots: PRIVATE_PAGE };
}

export default function NewPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-24">
      <Suspense>
        <FormForViewer />
      </Suspense>
    </main>
  );
}

/** Se llega desde el enlace del email, que ya ha iniciado una sesión de recuperación. */
async function FormForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar/recuperar?error=enlace");
  return <NewPasswordForm username={viewer.username} />;
}
