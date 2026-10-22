import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatShell } from "@/components/chat/chat-shell";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Chat", robots: PRIVATE_PAGE };

export default function ChatPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-6 sm:px-6">
      <h1 className="display mb-6 text-5xl font-bold">Chat</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-line/40" />}>
        <ChatForViewer />
      </Suspense>
    </main>
  );
}

async function ChatForViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/chat");
  return <ChatShell viewerId={viewer.id} friendId={null} />;
}
