import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatShell } from "@/components/chat/chat-shell";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";
import { getViewer } from "@/lib/session";
import { PRIVATE_PAGE } from "@/lib/seo";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: m.nav.chat, robots: PRIVATE_PAGE };
}

export default function ConversationPage({ params }: PageProps<"/[lang]/chat/[friendId]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-6 sm:px-6">
      <h1 className="display mb-6 hidden text-5xl font-bold lg:block">Chat</h1>
      <Suspense fallback={<ChatSkeleton conversation />}>
        <ChatForViewer params={params} />
      </Suspense>
    </main>
  );
}

async function ChatForViewer({ params }: { params: PageProps<"/[lang]/chat/[friendId]">["params"] }) {
  const { friendId } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=${encodeURIComponent(`/chat/${friendId}`)}`);
  return <ChatShell viewerId={viewer.id} viewerAvatar={{ seed: viewer.avatar_seed, parts: viewer.avatar_parts }} friendId={friendId} />;
}
