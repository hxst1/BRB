"use client";

import Link from "next/link";
import { useState } from "react";
import { pictoSrc, type Picto } from "@/lib/pictos";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/client";

export type FirstStep = { id: "monster" | "friend" | "daily"; done: boolean };

/** Cada paso con su dibujo, su destino y un color de los juegos (el de la barra y la marca de hecho). */
const STEPS: Record<FirstStep["id"], { picto: Picto; href: string; color: string }> = {
  monster: { picto: "palette", href: "/perfil", color: "var(--t2048)" },
  friend: { picto: "wave", href: "/amigos", color: "var(--mark-o)" },
  daily: { picto: "target", href: "/reto-diario", color: "var(--t256)" },
};

/**
 * Tres tareas para cuentas nuevas. Desaparece sola al completarlas; quien no
 * quiera seguirlas la cierra con la X y no vuelve a salir (se guarda en su perfil).
 */
export function FirstSteps({ viewerId, steps }: { viewerId: string; steps: FirstStep[] }) {
  const m = useMessages();
  const t = m.firstSteps;
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const done = steps.filter((step) => step.done).length;

  async function close() {
    setClosing(true);
    // Si no se guarda, volverá a salir la próxima vez: no merece un error.
    await createClient().from("profiles").update({ first_steps_dismissed: true }).eq("id", viewerId);
  }

  if (closed) return null;
  return (
    // Se pliega en vez de desaparecer de golpe, para que lo de debajo no salte.
    <div
      onTransitionEnd={(event) => closing && event.target === event.currentTarget && setClosed(true)}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        closing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <section aria-labelledby="first-steps-title" className="pt-10">
          <div className="rounded-3xl bg-surface p-4 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <h2 id="first-steps-title" className="text-xl font-semibold">
                  {t.title}
                </h2>
                <p className="text-sm text-muted tabular">{t.progress(done, steps.length)}</p>
              </div>
              <button
                type="button"
                onClick={() => void close()}
                aria-label={t.close}
                title={t.close}
                className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div aria-hidden className="mt-3 flex gap-1.5">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className="h-1.5 flex-1 rounded-full bg-line transition-colors duration-500"
                  style={step.done ? { background: STEPS[step.id].color } : undefined}
                />
              ))}
            </div>

            <ol className="mt-3 grid gap-1.5 sm:mt-4 sm:grid-cols-3 sm:gap-2">
              {steps.map((step) => (
                <li key={step.id}>
                  <Step step={step} />
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

function Step({ step }: { step: FirstStep }) {
  const t = useMessages().firstSteps;
  const { picto, href, color } = STEPS[step.id];
  const text = t[step.id];

  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface shadow-soft sm:size-11">
        {step.done ? (
          <span className="grid size-7 place-items-center rounded-full" style={{ background: color }}>
            <svg viewBox="0 0 24 24" aria-hidden className="size-4 text-[#15171c]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pictoSrc(picto)} alt="" aria-hidden draggable={false} className="size-8" />
        )}
      </span>
      <span className="flex min-w-0 flex-col sm:gap-0.5">
        <span className={`text-[0.9375rem] leading-snug font-semibold sm:text-base ${step.done ? "text-muted line-through decoration-2" : ""}`}>
          {text.title}
          {step.done && <span className="sr-only">. {t.done}</span>}
        </span>
        {!step.done && <span className="text-xs text-muted sm:text-sm">{text.hint}</span>}
      </span>
    </>
  );

  const base = "flex h-full items-center gap-3 rounded-2xl bg-bg p-2.5 sm:flex-col sm:items-start sm:p-3";
  if (step.done) return <div className={`${base} opacity-70`}>{content}</div>;
  return (
    <Link href={href} className={`${base} transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lift`}>
      {content}
    </Link>
  );
}
