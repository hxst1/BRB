"use client";

import { useMessages } from "@/lib/i18n/client";
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


/** Perfil: contar un problema, proponer una idea o valorar, y ver qué ha pasado con tus mensajes. */
export function FeedbackSection({ items }: { items: FeedbackItem[] }) {
  const m = useMessages();
  const t = m.feedbackSection;
  const statuses: Record<string, string> = t.statuses;
  const kinds: Record<string, string> = t.kinds;
  const buttons: { kind: FeedbackKind; label: string }[] = [
    { kind: "bug", label: t.report },
    { kind: "idea", label: t.idea },
    { kind: "rating", label: t.rate },
  ];

  return (
    <section aria-labelledby="feedback-section-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <div>
        <h2 id="feedback-section-title" className="font-semibold">
          {t.title}
        </h2>
        <p className="text-sm text-muted">{t.intro}</p>
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
          <h3 className="mb-1 text-sm text-muted">{t.yours}</h3>
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 border-b border-line py-2.5 last:border-b-0">
                <div className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span>
                    {kinds[item.kind] ?? item.kind}, {m.format.ago(item.created_at)}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 font-medium"
                    style={{
                      background: "var(--cell)",
                      color: item.status === "done" ? "var(--t512)" : item.status === "planned" ? "var(--t1024)" : undefined,
                    }}
                  >
                    {statuses[item.status] ?? item.status}
                  </span>
                </div>
                {item.rating && (
                  <span aria-label={t.stars(item.rating)} className="text-sm" style={{ color: "var(--t256)" }}>
                    {"★".repeat(item.rating)}
                    <span style={{ color: "var(--line)" }}>{"★".repeat(5 - item.rating)}</span>
                  </span>
                )}
                {item.body && <p className="line-clamp-3 text-sm">{item.body}</p>}
                {item.admin_reply && (
                  <p className="mt-1 rounded-2xl p-3 text-sm" style={{ background: "var(--cell)" }}>
                    <span className="mb-0.5 block text-xs text-muted">{t.reply}</span>
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
