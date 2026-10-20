"use client";

import { useActionState, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { updatePassword } from "../recovery-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition-colors focus:border-focus";

export function NewPasswordForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(updatePassword, { error: null });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="display mb-2 text-4xl font-bold text-balance">Elige una contraseña nueva</h1>
      <p className="-mt-2 text-muted">Para la cuenta de {username}.</p>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Contraseña nueva
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        <span className="text-xs font-normal text-muted">Al menos 8 caracteres.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Repite la contraseña
        <PasswordInput
          name="password_confirm"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={mismatch}
          className={inputClass}
        />
        {mismatch && <span className="text-xs font-normal text-danger">Las contraseñas no coinciden.</span>}
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || mismatch} className="mt-2 rounded-xl bg-ink py-3 font-semibold text-bg disabled:opacity-50">
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
