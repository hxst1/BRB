"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

export function CreateGroup() {
  const m = useMessages();
  const router = useRouter();
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const { data, error } = await createClient().rpc("create_group", { name: name.trim() });
    if (error || !data) {
      setSending(false);
      // 54000: ya está en el máximo de grupos.
      setError(error?.code === "54000" ? m.groups.tooMany : m.groups.createError);
      return;
    }
    router.push(`/grupos/${data}`);
  }

  return (
    <form onSubmit={create} className="flex flex-col gap-2">
      <label htmlFor="group-name" className="text-sm font-medium">
        {m.groups.name}
      </label>
      <div className="flex gap-2">
        <input
          id="group-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          required
          autoComplete="off"
          placeholder={m.groups.namePlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none placeholder:text-muted/50 focus:border-focus"
        />
        <button type="submit" disabled={sending || !name.trim()} className="rounded-xl bg-ink px-4 font-semibold text-bg disabled:opacity-40">
          {m.groups.create}
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-danger">
        {error}
      </p>
    </form>
  );
}
