import Link from "next/link";

/** En los juegos contra amigos, sin sesión: invita a entrar en vez de redirigir (así la página se puede leer). */
export function SignInPrompt({ next }: { next: string }) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-3 rounded-3xl bg-surface p-5 shadow-soft">
      <p className="font-semibold">Entra para retar a tus amigos</p>
      <p className="text-sm text-muted">Con una cuenta gratuita añades amigos con su código, los retas y te avisamos cuando te toca.</p>
      <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">
        Entrar o crear cuenta
      </Link>
    </div>
  );
}
