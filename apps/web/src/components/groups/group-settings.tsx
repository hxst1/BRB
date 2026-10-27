"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Cambiar el nombre y borrar (solo quien lo lleva) y salir del grupo. */
export function GroupSettings({ groupId, name, isAdmin }: { groupId: string; name: string; isAdmin: boolean }) {
  const m = useMessages();
  const router = useRouter();
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc("rename_group", { group_id: groupId, name: draft.trim() });
    setSaving(false);
    if (error) setError(m.groups.saveError);
    else router.refresh();
  }

  async function leave() {
    await createClient().rpc("leave_group", { group_id: groupId });
    router.push("/amigos");
    router.refresh();
  }

  async function remove() {
    await createClient().rpc("delete_group", { group_id: groupId });
    router.push("/amigos");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-6">
      {isAdmin && (
        <form onSubmit={rename} className="flex flex-col gap-2">
          <label htmlFor="group-rename" className="text-sm font-medium">
            {m.groups.rename}
          </label>
          <div className="flex gap-2">
            <input
              id="group-rename"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={40}
              required
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-focus"
            />
            <button
              type="submit"
              disabled={saving || !draft.trim() || draft.trim() === name}
              className="rounded-xl bg-ink px-4 font-semibold text-bg disabled:opacity-40"
            >
              {m.groups.save}
            </button>
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-danger">
            {error}
          </p>
        </form>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-3">
            <ConfirmButton label={m.groups.leave} confirmLabel={m.groups.confirmLeave} onConfirm={() => void leave()} />
          </span>
          {isAdmin && (
            <span className="flex items-center gap-3">
              <ConfirmButton label={m.groups.delete} confirmLabel={m.groups.confirmDelete} onConfirm={() => void remove()} />
            </span>
          )}
        </div>
        {isAdmin && <p className="text-xs text-muted">{m.groups.leaveAsAdmin}</p>}
      </div>
    </section>
  );
}
