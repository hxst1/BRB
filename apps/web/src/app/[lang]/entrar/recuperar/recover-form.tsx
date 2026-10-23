"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../recovery-actions";
import { useMessages } from "@/lib/i18n/client";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition-colors focus:border-focus";

export function RecoverForm({ expiredLink }: { expiredLink: boolean }) {
  const m = useMessages();
  const t = m.recover;
  const [state, action, pending] = useActionState(requestPasswordReset, { error: null, sent: false });

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="display text-4xl font-bold text-balance">{t.checkEmail}</h1>
        <p className="text-muted">
          {t.sent}
        </p>
        <Link href="/entrar" className="font-medium underline underline-offset-4">
          {t.back}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="display mb-2 text-4xl font-bold text-balance">{m.auth.forgot}</h1>
      <p className="-mt-2 text-muted">{t.intro}</p>

      {expiredLink && (
        <p role="alert" className="rounded-xl bg-surface p-3 text-sm text-danger shadow-soft">
          {t.expired}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="mt-2 rounded-xl bg-ink py-3 font-semibold text-bg disabled:opacity-50">
        {pending ? m.feedback.sending : t.send}
      </button>
      <Link href="/entrar" className="text-center text-sm text-muted hover:text-ink">
        {t.back}
      </Link>
    </form>
  );
}
