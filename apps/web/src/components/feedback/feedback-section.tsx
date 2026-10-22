"use client";

import { formatAgo } from "@/lib/format";
import { showFeedback, type FeedbackKind } from "./feedback-dialog";

export type FeedbackItem = {
  id: string;
  kind: string;
  body: string | null;
  rating: number | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

const STATUS: Record<string, string> = {
  new: "Enviado",
  seen: "Leído",
  planned: "Lo haremos",
  done: "Hecho",
  dismissed: "Descartado",
};

const KIND_LABEL: Record<string, string> = { bug: "Problema", idea: "Idea", rating: "Valoración" };

/** Perfil: contar un problema, proponer una idea o valorar, y ver qué ha pasado con tus mensajes. */
export function FeedbackSection({ items }: { items: FeedbackItem[] }) {
  const buttons: { kind: FeedbackKind; label: string }[] = [
    { kind: "bug", label: "Reportar un problema" },
    { kind: "idea", label: "Proponer una idea" },
    { kind: "rating", label: "Valorar la app" },
  ];

  return (
    <section aria-labelledby="feedback-section-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div>
        <h2 id="feedback-section-title" className="font-semibold">
          Ayúdanos a mejorar
        </h2>
        <p className="text-sm text-muted">Si algo falla o se te ocurre algo, cuéntanoslo. Lo leemos todo.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => showFeedback(kind)}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted"
          >
            {label}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col">
          <h3 className="mb-1 text-sm text-muted">Tus mensajes</h3>
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 border-b border-line py-2.5 last:border-b-0">
                <div className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span>
                    {KIND_LABEL[item.kind] ?? item.kind}, {formatAgo(item.created_at)}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 font-medium"
                    style={{
                      background: "var(--cell)",
                      color: item.status === "done" ? "var(--t512)" : item.status === "planned" ? "var(--t1024)" : undefined,
                    }}
                  >
                    {STATUS[item.status] ?? item.status}
                  </span>
                </div>
                {item.rating && (
                  <span aria-label={`${item.rating} de 5 estrellas`} className="text-sm" style={{ color: "var(--t256)" }}>
                    {"★".repeat(item.rating)}
                    <span style={{ color: "var(--line)" }}>{"★".repeat(5 - item.rating)}</span>
                  </span>
                )}
                {item.body && <p className="line-clamp-3 text-sm">{item.body}</p>}
                {item.admin_reply && (
                  <p className="mt-1 rounded-2xl p-3 text-sm" style={{ background: "var(--cell)" }}>
                    <span className="mb-0.5 block text-xs text-muted">Respuesta</span>
                    {item.admin_reply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
