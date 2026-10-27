"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { useMessages } from "@/lib/i18n/client";
import { authenticate, resendConfirmation, type AuthState } from "./actions";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition-colors focus:border-focus";

/**
 * El formulario de entrar mientras se lee la petición (a dónde volver, si te
 * han invitado…): el mismo, con sus textos, sin poder usarse todavía.
 */
export function AuthFormSkeleton() {
  const m = useMessages();
  const t = m.auth;
  const field = `${inputClass} h-[2.875rem]`;
  return (
    <div aria-hidden inert className="flex flex-col gap-4">
      <p className="display mb-2 text-4xl font-bold text-balance">{t.signin.title}</p>
      <p className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <span className={field} />
      </p>
      <p className="flex flex-col gap-1.5 text-sm font-medium">
        {m.account.password}
        <span className={field} />
      </p>
      <p className="-mt-2 self-end text-sm text-muted">{t.forgot}</p>
      <p className="mt-2 rounded-xl bg-ink py-3 text-center font-semibold text-bg">{t.signin.submit}</p>
      <p className="text-center text-sm text-muted">
        {t.signin.switchText} <span className="font-medium text-ink underline underline-offset-4">{t.signin.switchAction}</span>
      </p>
    </div>
  );
}

export function AuthForm({
  next,
  initialMode = "signin",
  inviteCode = "",
}: {
  next: string;
  initialMode?: AuthState["mode"];
  /** Código de quien te invitó, si llegaste por su enlace. */
  inviteCode?: string;
}) {
  const [mode, setMode] = useState<AuthState["mode"]>(initialMode);
  const [state, action, pending] = useActionState(authenticate, { error: null, mode });
  const m = useMessages();
  const t = m.auth;
  const copy = t[mode];
  const error = state.mode === mode ? state.error : null;
  const fields = state.fields;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Solo se avisa cuando ya ha escrito algo en la confirmación.
  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

  if (state.confirmEmail) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="display text-4xl font-bold text-balance">{t.confirmTitle}</h1>
        <p className="text-muted">
          {t.confirmBefore}
          <strong className="text-ink">{state.confirmEmail}</strong>
          {t.confirmAfter}
        </p>
        <form className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {t.notArrived}
          <ResendConfirmation email={state.confirmEmail} />
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="display mb-2 text-4xl font-bold text-balance">{copy.title}</h1>

      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t.playerName}
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            autoComplete="username"
            defaultValue={fields?.username}
            className={inputClass}
          />
          <span className="text-xs font-normal text-muted">{t.playerNameHint}</span>
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" defaultValue={fields?.email} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {m.account.password}
        <PasswordInput
          name="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        {mode === "signup" && <span className="text-xs font-normal text-muted">{t.atLeast8}</span>}
      </label>

      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t.repeat}
          <PasswordInput
            name="password_confirm"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={mismatch}
            aria-describedby={mismatch ? "confirm-hint" : undefined}
            className={inputClass}
          />
          {mismatch && (
            <span id="confirm-hint" className="text-xs font-normal text-danger">
              {t.mismatch}
            </span>
          )}
        </label>
      )}

      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t.inviteCode}
          <input
            name="invite_code"
            defaultValue={fields?.inviteCode ?? inviteCode}
            maxLength={5}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${inputClass} uppercase`}
          />
          <span className="text-xs font-normal text-muted">{t.inviteCodeHint}</span>
        </label>
      )}

      {mode === "signup" && (
        // Edad mínima para dar el consentimiento en España: 14 años (LOPDGDD, art. 7).
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="accept" required defaultChecked={fields?.accept} className="mt-0.5 size-4 shrink-0 accent-ink" />
          <span>
            {t.acceptBefore}{" "}
            <Link href="/legal/terminos" target="_blank" className="font-medium underline underline-offset-4">
              {t.terms}
            </Link>{" "}
            {t.acceptAnd}{" "}
            <Link href="/legal/privacidad" target="_blank" className="font-medium underline underline-offset-4">
              {t.privacy}
            </Link>
            .
          </span>
        </label>
      )}

      {mode === "signin" && (
        <Link href="/entrar/recuperar" className="-mt-2 self-end text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {t.forgot}
        </Link>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {error && state.unconfirmed && <ResendConfirmation email={state.unconfirmed} />}

      <button
        type="submit"
        disabled={pending || mismatch}
        className="mt-2 rounded-xl bg-ink py-3 font-semibold text-bg transition-opacity disabled:opacity-50"
      >
        {pending ? t.wait : copy.submit}
      </button>

      <p className="text-center text-sm text-muted">
        {copy.switchText}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-ink underline underline-offset-4"
        >
          {copy.switchAction}
        </button>
      </p>
    </form>
  );
}

/**
 * Pide otro email de confirmación. Es un botón del formulario que lo rodea
 * (no puede haber un formulario dentro de otro), con su propia acción.
 */
function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, { sent: false, error: null });
  const t = useMessages().auth;

  if (state.sent) {
    return (
      <p role="status" className="text-sm text-muted">
        {t.resent(email)}
      </p>
    );
  }
  return (
    <>
      <input type="hidden" name="resend_email" value={email} />
      <button
        type="submit"
        formAction={action}
        formNoValidate
        disabled={pending}
        className="self-start text-sm font-medium text-ink underline underline-offset-4 disabled:opacity-50"
      >
        {pending ? t.wait : t.resend}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </>
  );
}
