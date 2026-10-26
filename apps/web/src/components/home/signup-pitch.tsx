import Link from "next/link";
import { signupHref } from "@/lib/signup";
import { getMessages } from "@/lib/i18n/server";
import { pictoSrc } from "@/lib/pictos";


/** Botones para crear cuenta o entrar, para el principio de la portada sin sesión. */
export async function SignupButtons() {
  const m = await getMessages();
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link href={signupHref("/")} className="rounded-full bg-ink px-6 py-3 font-semibold text-bg transition-transform active:scale-[0.98]">
        {m.common.signUpFree}
      </Link>
      <Link href="/entrar" className="rounded-full border border-line bg-surface px-6 py-3 font-semibold shadow-soft hover:border-muted">
        {m.signup.haveAccount}
      </Link>
    </div>
  );
}

/** Qué ganas con una cuenta, con otra llamada a crearla. */
export async function SignupPerks() {
  const m = await getMessages();
  return (
    <section aria-labelledby="perks-title" className="flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      <div>
        <h2 id="perks-title" className="display text-3xl font-bold sm:text-4xl">
          {m.signup.perksTitle}
        </h2>
        <p className="text-muted">{m.signup.perksIntro}</p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {m.signup.perks.map((perk) => (
          <li key={perk.title} className="flex gap-3">
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--cell)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pictoSrc(perk.icon)} alt="" className="size-7" />
            </span>
            <span className="flex flex-col">
              <span className="font-semibold">{perk.title}</span>
              <span className="text-sm text-muted">{perk.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link href={signupHref("/")} className="self-start rounded-full bg-ink px-6 py-3 font-semibold text-bg transition-transform active:scale-[0.98]">
        {m.signup.createMine}
      </Link>
    </section>
  );
}
