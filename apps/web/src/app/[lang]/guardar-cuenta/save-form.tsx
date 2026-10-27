"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { useMessages } from "@/lib/i18n/client";
import { saveGuestAccount, type SaveState } from "./actions";

export function SaveAccountForm({ username }: { username: string }) {
  const m = useMessages();
  const t = m.saveAccount;
  const [state, action, pending] = useActionState<SaveState, FormData>(saveGuestAccount, { error: null });

  if (state.saved) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="display text-3xl font-bold">{t.done}</p>
        <p className="text-muted">{t.doneBody}</p>
        <Link href="/" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
          {t.continue}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {m.account.username}
        <input
          name="username"
          defaultValue={state.fields?.username ?? username}
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]{3,20}"
          autoComplete="username"
          className="rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-base font-normal outline-none focus:border-focus"
        />
        <span className="font-normal text-muted">{t.usernameHint}</span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t.email}
        <input
          name="email"
          type="email"
          defaultValue={state.fields?.email}
          required
          autoComplete="email"
          className="rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-base font-normal outline-none focus:border-focus"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t.password}
        <PasswordInput name="password" autoComplete="new-password" minLength={8} required className="w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-base font-normal outline-none focus:border-focus" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t.repeat}
        <PasswordInput name="repeat" autoComplete="new-password" minLength={8} required className="w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-base font-normal outline-none focus:border-focus" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" required className="mt-0.5 size-4" />
        <span>
          {t.acceptBefore}
          <Link href="/legal/terminos" className="underline underline-offset-4">
            {t.terms}
          </Link>
          {t.acceptMiddle}
          <Link href="/legal/privacidad" className="underline underline-offset-4">
            {t.privacy}
          </Link>
          .
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-3 font-semibold text-bg disabled:opacity-60">
        {pending ? m.common.saving : t.submit}
      </button>
    </form>
  );
}
