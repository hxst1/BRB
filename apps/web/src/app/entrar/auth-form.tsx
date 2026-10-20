"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { authenticate, type AuthState } from "./actions";

const COPY = {
  signin: {
    title: "Entra para guardar tus puntuaciones",
    submit: "Entrar",
    switchText: "¿Aún no tienes cuenta?",
    switchAction: "Crear una",
  },
  signup: {
    title: "Crea tu cuenta",
    submit: "Crear cuenta",
    switchText: "¿Ya tienes cuenta?",
    switchAction: "Entrar",
  },
} as const;

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition-colors focus:border-focus";

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<AuthState["mode"]>("signin");
  const [state, action, pending] = useActionState(authenticate, { error: null, mode });
  const copy = COPY[mode];
  const error = state.mode === mode ? state.error : null;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Solo se avisa cuando ya ha escrito algo en la confirmación.
  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="display mb-2 text-4xl font-bold text-balance">{copy.title}</h1>

      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nombre de jugador
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            autoComplete="username"
            className={inputClass}
          />
          <span className="text-xs font-normal text-muted">Es lo que verán tus amigos y el ranking.</span>
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Contraseña
        <PasswordInput
          name="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        {mode === "signup" && <span className="text-xs font-normal text-muted">Al menos 8 caracteres.</span>}
      </label>

      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Repite la contraseña
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
              Las contraseñas no coinciden.
            </span>
          )}
        </label>
      )}

      {mode === "signin" && (
        <Link href="/entrar/recuperar" className="-mt-2 self-end text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          ¿Has olvidado tu contraseña?
        </Link>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || mismatch}
        className="mt-2 rounded-xl bg-ink py-3 font-semibold text-bg transition-opacity disabled:opacity-50"
      >
        {pending ? "Un momento…" : copy.submit}
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
