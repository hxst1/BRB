"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/[lang]/perfil/actions";
import { PasswordInput } from "@/components/password-input";
import { useMessages } from "@/lib/i18n/client";

const FIELD = "w-full rounded-2xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-focus";
const INITIAL: DeleteAccountState = { error: null };

/** Borrar la cuenta: explica qué se pierde y pide nombre, código de amigo y contraseña. */
export function DeleteAccount({ friendCode }: { friendCode: string | null }) {
  const m = useMessages();
  const t = m.deleteAccount;
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
        {t.title}
      </h2>
      {!open ? (
        <>
          <p className="text-sm text-muted">{t.intro}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start rounded-full border border-danger/60 px-4 py-2 text-sm font-semibold text-danger hover:border-danger"
          >
            {t.open}
          </button>
        </>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <div className="text-sm">
            <p className="mb-1">{t.listTitle}</p>
            <ul className="list-disc pl-5 text-muted">
              {t.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t.username}</span>
            <input {...bind("username")} required autoComplete="off" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-baseline justify-between gap-2 text-muted">
              {m.friends.yourCode}
              {friendCode && (
                <span>
                  {t.itIs} <strong className="tabular tracking-wider text-ink">{friendCode}</strong>
                </span>
              )}
            </span>
            <input {...bind("code")} required autoComplete="off" maxLength={5} className={`${FIELD} uppercase`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t.password}</span>
            <PasswordInput {...bind("password")} required autoComplete="current-password" className={FIELD} />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? t.deleting : t.confirm}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
              {m.common.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
