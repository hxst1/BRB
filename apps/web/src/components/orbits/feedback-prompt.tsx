"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Se pregunta una sola vez: al contestar o al cerrar, queda como visto. */
const SEEN_ID = "orbits-feedback";
/** Tras la partida, un momento para que se vea cómo ha acabado. */
const DELAY_MS = 1200;

const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

type Answer = "love" | "ok" | "meh";
/** Lo que llega al panel de admin, en español sea cual sea el idioma de quien contesta. */
const ANSWER_LABEL: Record<Answer, string> = { love: "me encanta", ok: "está bien", meh: "no me convence" };

/**
 * Órbitas está en pruebas: al acabar la primera partida, pregunta con
 * sinceridad si es divertido. Va a feedback como una idea, con la respuesta y
 * el comentario, desde /orbitas (así se encuentra en el panel de admin).
 */
export function OrbitsFeedbackPrompt({ ready }: { ready: boolean }) {
  const m = useMessages();
  const t = m.orbits.feedback;
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const closeButton = useRef<HTMLButtonElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!ready || asked.current) return;
    asked.current = true;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data: seen } = await createClient().from("seen_announcements").select("announcement").eq("announcement", SEEN_ID).limit(1);
      if (cancelled || (seen ?? []).length > 0 || document.querySelector("[role=dialog][aria-modal=true]")) return;
      setOpen(true);
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    void createClient()
      .rpc("mark_announcements_seen", { ids: [SEEN_ID] })
      .then(() => undefined);
  }

  async function send() {
    if (!answer) return;
    setState("sending");
    const comment = body.trim();
    await createClient().rpc("submit_feedback", {
      kind: "idea",
      body: `Órbitas (en pruebas): ${ANSWER_LABEL[answer]}${comment ? `. ${comment}` : ""}`,
      path: "/orbitas",
      user_agent: navigator.userAgent,
      app_version: APP_VERSION,
    });
    setState("sent");
    void createClient()
      .rpc("mark_announcements_seen", { ids: [SEEN_ID] })
      .then(() => undefined);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="orbits-feedback-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex w-full max-w-md flex-col gap-4 rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label={m.common.close}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {state === "sent" ? (
          <>
            <div className="pr-8">
              <h2 id="orbits-feedback-title" className="display text-3xl leading-tight font-bold">
                {t.thanks}
              </h2>
              <p className="mt-2 text-muted">{t.thanksBody}</p>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-muted hover:text-ink">
                {m.common.close}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="pr-8">
              <p className="text-sm text-muted">{t.kicker}</p>
              <h2 id="orbits-feedback-title" className="display text-3xl leading-tight font-bold">
                {t.title}
              </h2>
              <p className="mt-2 text-muted">{t.body}</p>
            </div>
            <div role="radiogroup" aria-labelledby="orbits-feedback-title" className="grid grid-cols-3 gap-2">
              {(Object.keys(t.answers) as Answer[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={answer === option}
                  onClick={() => setAnswer(option)}
                  className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition-colors ${
                    answer === option ? "border-ink bg-ink text-bg" : "border-line bg-bg hover:border-muted"
                  }`}
                >
                  {t.answers[option]}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={1500}
              placeholder={t.placeholder}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-base outline-none focus:border-focus"
            />
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={close} className="text-sm font-medium text-muted hover:text-ink">
                {t.later}
              </button>
              <button
                type="button"
                disabled={!answer || state === "sending"}
                onClick={() => void send()}
                className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg disabled:opacity-40"
              >
                {state === "sending" ? m.feedback.sending : t.send}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
