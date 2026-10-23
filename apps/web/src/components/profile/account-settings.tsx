"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import { changePassword, type PasswordChangeState } from "@/app/[lang]/perfil/actions";
import { PasswordInput } from "@/components/password-input";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useMessages } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n";

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
/** " Podrás volver a hacerlo el 29 de octubre, 18:20." (o nada si la fecha no se puede leer). */
function nextChange(iso: string | undefined, locale: string, m: Messages): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return m.account.nextChange(new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(date));
}

/** Tu cuenta: cambiar el nombre de usuario y la contraseña. */
export function AccountSettings({ userId, username }: { userId: string; username: string }) {
  const m = useMessages();
  return (
    <section aria-labelledby="account-title" className="flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft">
      <h2 id="account-title" className="font-semibold">
        {m.account.title}
      </h2>
      <UsernameForm userId={userId} username={username} />
      <div className="border-t border-line" />
      <PasswordForm />
    </section>
  );
}

function UsernameForm({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const m = useMessages();
  const locale = useLocale();
  const [value, setValue] = useState(username);
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });
  const changed = value.trim() !== username;

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (!USERNAME.test(next)) {
      setState({ kind: "error", message: m.account.usernameRule });
      return;
    }
    setState({ kind: "saving" });
    const { error } = await createClient().from("profiles").update({ username: next }).eq("id", userId);
    if (error) {
      setState({
        kind: "error",
        message:
          error.code === "23505"
            ? m.account.taken(next)
            : error.hint === "username_cooldown"
              ? m.account.cooldown + nextChange(error.details, locale, m)
              : m.account.changeError,
      });
      return;
    }
    setState({ kind: "saved" });
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-2">
      <label htmlFor="username" className="text-sm font-medium">
        {m.account.username}
      </label>
      <div className="flex gap-2">
        <input
          id="username"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setState({ kind: "idle" });
          }}
          maxLength={20}
          autoComplete="username"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-focus"
        />
        <button
          type="submit"
          disabled={!changed || state.kind === "saving"}
          className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-40"
        >
          {state.kind === "saving" ? m.common.saving : m.account.change}
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-muted">
        {state.kind === "error" ? (
          <span className="text-danger">{state.message}</span>
        ) : state.kind === "saved" ? (
          m.account.usernameChanged
        ) : (
          m.account.usernameHint
        )}
      </p>
    </form>
  );
}

const INITIAL: PasswordChangeState = { error: null, done: false };

function PasswordForm() {
  const m = useMessages();
  const [state, action, pending] = useActionState(changePassword, INITIAL);
  // Controlados: si hay un error, lo escrito se conserva (React vacía los formularios tras cada acción).
  const [fields, setFields] = useState({ current: "", password: "", password_confirm: "" });
  const bind = (name: keyof typeof fields) => ({
    name,
    value: fields[name],
    onChange: (event: { target: { value: string } }) => setFields((values) => ({ ...values, [name]: event.target.value })),
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm font-medium">{m.account.password}</p>
      {state.done ? (
        <p className="text-sm">{m.account.passwordChanged}</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{m.account.current}</span>
            <PasswordInput {...bind("current")} autoComplete="current-password" required className="w-full rounded-2xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-focus" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{m.account.newPassword}</span>
            <PasswordInput {...bind("password")} autoComplete="new-password" required minLength={8} className="w-full rounded-2xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-focus" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{m.account.repeat}</span>
            <PasswordInput {...bind("password_confirm")} autoComplete="new-password" required minLength={8} className="w-full rounded-2xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-focus" />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="submit" disabled={pending} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-40">
              {pending ? m.account.changing : m.account.changePassword}
            </button>
            <Link href="/entrar/recuperar" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              {m.account.forgot}
            </Link>
          </div>
        </>
      )}
    </form>
  );
}
