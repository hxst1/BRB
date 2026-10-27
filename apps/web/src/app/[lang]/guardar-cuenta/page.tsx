import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/server";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getIsGuest, getViewer } from "@/lib/session";
import { SaveAccountForm } from "./save-form";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.saveAccount.title, robots: PRIVATE_PAGE };
}

/** Guardar la cuenta de invitado: email y contraseña (y, si quiere, otro nombre). */
export default async function SaveAccountPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-4 pb-24">
      <div>
        <h1 className="display text-5xl font-bold">{m.saveAccount.title}</h1>
        <p className="mt-2 text-muted">{m.saveAccount.intro}</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-line/40" />}>
        <Form />
      </Suspense>
    </main>
  );
}

async function Form() {
  const [viewer, guest] = await Promise.all([getViewer(), getIsGuest()]);
  if (!viewer) redirect("/entrar");
  if (!guest) redirect("/perfil");
  return <SaveAccountForm username={viewer.username} />;
}
