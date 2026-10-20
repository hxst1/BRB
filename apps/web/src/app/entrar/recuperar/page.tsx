import type { Metadata } from "next";
import { Suspense } from "react";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage({ searchParams }: PageProps<"/entrar/recuperar">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-24">
      <Suspense>
        <RecoverForRequest searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RecoverForRequest({ searchParams }: { searchParams: PageProps<"/entrar/recuperar">["searchParams"] }) {
  const { error } = await searchParams;
  return <RecoverForm expiredLink={error === "enlace"} />;
}
