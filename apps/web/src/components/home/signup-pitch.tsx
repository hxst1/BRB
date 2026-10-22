import Link from "next/link";
import { signupHref } from "@/lib/signup";

const PERKS = [
  { icon: "🏆", title: "Tus récords, guardados", detail: "Y tu puesto en el ranking mundial y entre tus amigos." },
  { icon: "👋", title: "Juega con tus amigos", detail: "Rétalos a 3 en raya, Hundir la flota, Pong o Tron, y chatea." },
  { icon: "🔥", title: "Reto diario y rachas", detail: "Un juego distinto cada día, la misma partida para todos." },
  { icon: "🎨", title: "Tu propio monster", detail: "Personalízalo y gana ropa nueva con los logros." },
];

/** Botones para crear cuenta o entrar, para el principio de la portada sin sesión. */
export function SignupButtons() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link href={signupHref("/")} className="rounded-full bg-ink px-6 py-3 font-semibold text-bg transition-transform active:scale-[0.98]">
        Crear cuenta gratis
      </Link>
      <Link href="/entrar" className="rounded-full border border-line bg-surface px-6 py-3 font-semibold shadow-soft hover:border-muted">
        Ya tengo cuenta
      </Link>
    </div>
  );
}

/** Qué ganas con una cuenta, con otra llamada a crearla. */
export function SignupPerks() {
  return (
    <section aria-labelledby="perks-title" className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      <div>
        <h2 id="perks-title" className="display text-3xl font-bold sm:text-4xl">
          Con una cuenta gratis
        </h2>
        <p className="text-muted">Se crea en un minuto, sin datos de pago. Solo un email y un nombre.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {PERKS.map((perk) => (
          <li key={perk.title} className="flex gap-3">
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: "var(--cell)" }}>
              {perk.icon}
            </span>
            <span className="flex flex-col">
              <span className="font-semibold">{perk.title}</span>
              <span className="text-sm text-muted">{perk.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link href={signupHref("/")} className="self-start rounded-full bg-ink px-6 py-3 font-semibold text-bg transition-transform active:scale-[0.98]">
        Crear mi cuenta
      </Link>
    </section>
  );
}
