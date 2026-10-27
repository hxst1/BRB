import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";
import { getIsGuest } from "@/lib/session";

/** Con una cuenta de invitado: un aviso arriba para guardarla (si no, se borra a los 30 días sin usarse). */
export async function GuestSaveNotice() {
  if (!(await getIsGuest())) return null;
  const m = await getMessages();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 pl-4 text-sm shadow-soft">
        <span className="text-balance">{m.invite.guestNotice}</span>
        <Link href="/guardar-cuenta" className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 font-semibold text-bg">
          {m.invite.save}
        </Link>
      </div>
    </div>
  );
}
