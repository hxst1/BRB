import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatShell } from "@/components/chat/chat-shell";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Chat" };

export default function ConversationPage({ params }: PageProps<"/chat/[friendId]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-6 sm:px-6">
      <h1 className="display mb-6 hidden text-5xl font-bold lg:block">Chat</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-line/40" />}>
        <ChatForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function ChatForViewer({ params }: { params: PageProps<"/chat/[friendId]">["params"] }) {
  const { friendId } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/chat/${friendId}`)}`);
  return <ChatShell viewerId={viewer.id} friendId={friendId} />;
}
