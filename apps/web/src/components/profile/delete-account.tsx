"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/perfil/actions";
import { PasswordInput } from "@/components/password-input";

const FIELD = "w-full rounded-2xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-focus";
const INITIAL: DeleteAccountState = { error: null };

/** Borrar la cuenta: explica qué se pierde y pide nombre, código de amigo y contraseña. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, INITIAL);
  // Controlados: si hay un error, lo escrito se conserva (React vacía los formularios tras cada acción).
  const [fields, setFields] = useState({ username: "", code: "", password: "" });
  const bind = (name: keyof typeof fields) => ({
    name,
    value: fields[name],
    onChange: (event: { target: { value: string } }) => setFields((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <section aria-labelledby="delete-title" className="flex flex-col gap-3 rounded-3xl border border-danger/40 p-5">
      <h2 id="delete-title" className="font-semibold text-danger">
        Borrar tu cuenta
      </h2>
      {!open ? (
        <>
          <p className="text-sm text-muted">Se borra todo y no se puede deshacer.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start rounded-full border border-danger/60 px-4 py-2 text-sm font-semibold text-danger hover:border-danger"
          >
            Quiero borrar mi cuenta
          </button>
        </>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <div className="text-sm">
            <p className="mb-1">Se borrarán para siempre, sin dejar ningún registro:</p>
            <ul className="list-disc pl-5 text-muted">
              <li>Tu cuenta, tu email y tu personaje.</li>
              <li>Tus partidas, récords, logros y rachas.</li>
              <li>Tus amigos, retos y todos los chats (también para la otra persona).</li>
              <li>Tus mensajes, avisos y los pagos de apoyo registrados.</li>
            </ul>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Tu nombre de usuario</span>
            <input {...bind("username")} required autoComplete="off" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Tu código de amigo (lo tienes en Amigos)</span>
            <input {...bind("code")} required autoComplete="off" maxLength={5} className={`${FIELD} uppercase`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Tu contraseña</span>
            <PasswordInput {...bind("password")} required autoComplete="current-password" className={FIELD} />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Borrando…" : "Borrar mi cuenta para siempre"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
