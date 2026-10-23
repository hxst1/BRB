import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";

/** En los juegos contra amigos, sin sesión: invita a entrar en vez de redirigir (así la página se puede leer). */
export async function SignInPrompt({ next }: { next: string }) {
  const m = await getMessages();
  return (
    <div className="flex max-w-xl flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-soft">
      <p className="font-semibold">{m.signInPrompt.title}</p>
      <p className="text-sm text-muted">{m.signInPrompt.body}</p>
      <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        {m.signInPrompt.cta}
      </Link>
    </div>
  );
}
