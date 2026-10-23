import type { Metadata } from "next";
import Link from "next/link";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.deleteAccount.doneTitle, robots: PRIVATE_PAGE };
}

export default async function DeletedAccountPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 pt-10 pb-16 sm:px-6">
      <h1 className="display text-5xl font-bold">{m.deleteAccount.doneTitle}</h1>
      <p className="text-muted">{m.deleteAccount.doneBody}</p>
      <Link href="/" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.common.backHome}
      </Link>
    </main>
  );
}
