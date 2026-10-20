import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-24">
      <Suspense>
        <AuthForm />
      </Suspense>
    </main>
  );
}
