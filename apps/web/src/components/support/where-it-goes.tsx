"use client";

import { useMessages } from "@/lib/i18n/client";
import { pictoSrc } from "@/lib/pictos";

/**
 * A dónde va el dinero de los apoyos, para ser transparentes. Si cambia en
 * qué se gasta, se cambia en m.support.spending.
 */
export function WhereItGoes({ compact = false }: { compact?: boolean }) {
  const m = useMessages();
  return (
    <section aria-labelledby="where-title" className="flex flex-col gap-3">
      <h2 id="where-title" className={compact ? "font-semibold" : "text-xl font-semibold"}>
        {m.support.whereTitle}
      </h2>
      <ul className="flex flex-col gap-2">
        {m.support.spending.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: "var(--cell)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pictoSrc(item.icon)} alt="" className="size-6" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{item.title}</span>
              {!compact && <span className="text-sm text-muted">{item.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        {m.support.never}
      </p>
    </section>
  );
}
