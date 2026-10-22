import type { Metadata } from "next";
import { Suspense } from "react";
import { RecoverForm } from "./recover-form";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: PRIVATE_PAGE };

export default function RecoverPage({ searchParams }: PageProps<"/[lang]/entrar/recuperar">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-24">
      <Suspense>
        <RecoverForRequest searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RecoverForRequest({ searchParams }: { searchParams: PageProps<"/[lang]/entrar/recuperar">["searchParams"] }) {
  const { error } = await searchParams;
  return <RecoverForm expiredLink={error === "enlace"} />;
}
