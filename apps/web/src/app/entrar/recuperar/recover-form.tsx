"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../recovery-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none transition-colors focus:border-focus";

export function RecoverForm({ expiredLink }: { expiredLink: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, { error: null, sent: false });

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="display text-4xl font-bold text-balance">Revisa tu correo</h1>
        <p className="text-muted">
          Si hay una cuenta con ese email, te hemos enviado un enlace para elegir una contraseña nueva. Puede tardar un
          par de minutos; mira también en spam.
        </p>
        <Link href="/entrar" className="font-medium underline underline-offset-4">
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="display mb-2 text-4xl font-bold text-balance">¿Has olvidado tu contraseña?</h1>
      <p className="-mt-2 text-muted">Escribe el email de tu cuenta y te mandamos un enlace para elegir una nueva.</p>

      {expiredLink && (
        <p role="alert" className="rounded-xl bg-surface p-3 text-sm text-danger shadow-soft">
          Ese enlace ya no vale (caduca al rato y solo se puede usar una vez). Pide otro aquí.
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
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
      <Link href="/entrar" className="text-center text-sm text-muted hover:text-ink">
        Volver a entrar
      </Link>
    </form>
  );
}
