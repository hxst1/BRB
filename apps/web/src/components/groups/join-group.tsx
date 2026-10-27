"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

export function JoinGroup({ code }: { code: string }) {
  const m = useMessages();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setJoining(true);
    setError(null);
    const { data, error } = await createClient().rpc("join_group", { code });
    if (error || !data) {
      setJoining(false);
      // 54000: ya está en el máximo de grupos (o se ha llenado justo ahora).
      setError(error?.code === "54000" ? m.groups.join.tooMany : m.groups.join.error);
      return;
    }
    router.push(`/grupos/${data}`);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" disabled={joining} onClick={() => void join()} className="rounded-full bg-ink px-6 py-3 font-semibold text-bg disabled:opacity-50">
        {m.groups.join.button}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-danger">
        {error}
      </p>
    </div>
  );
}
