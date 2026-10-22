"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FeedbackKind = "bug" | "idea" | "rating";

/** Evento para abrir el diálogo desde cualquier sitio (menú de la cuenta, perfil…). */
const SHOW_EVENT = "show-feedback";

export function showFeedback(kind: FeedbackKind = "bug") {
  window.dispatchEvent(new CustomEvent<FeedbackKind>(SHOW_EVENT, { detail: kind }));
}

const KINDS: { value: FeedbackKind; label: string; placeholder: string }[] = [
  { value: "bug", label: "Un problema", placeholder: "¿Qué ha pasado? Cuanto más concreto, antes lo arreglamos: en qué juego, qué hiciste…" },
  { value: "idea", label: "Una idea", placeholder: "Un juego que te gustaría, algo que cambiarías…" },
  { value: "rating", label: "Valorar", placeholder: "Si quieres, cuéntanos por qué (opcional)." },
];

/** Versión publicada (commit de Vercel), para saber en qué versión pasó un problema. */
const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

/**
 * Diálogo para contar un problema, proponer una idea o valorar la app con
 * estrellas. Se guarda con la pantalla en la que estabas, el navegador y la
 * versión, para el panel de admin.
 */
export function FeedbackDialog() {
  const router = useRouter();
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  // La pantalla en la que se abrió, para saber dónde pasó un problema.
  const [from, setFrom] = useState("");

  useEffect(() => {
    const show = (event: Event) => {
      setKind((event as CustomEvent<FeedbackKind>).detail);
      setFrom(window.location.pathname);
      setState("idle");
      setError(null);
    };
    window.addEventListener(SHOW_EVENT, show);
    return () => window.removeEventListener(SHOW_EVENT, show);
  }, []);

  useEffect(() => {
    if (!kind) return;
    if (kind !== "rating") textarea.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setKind(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind]);

  // Tras enviar, el formulario ya queda vacío: cerrar solo lo oculta.
  const close = () => setKind(null);

  async function send() {
    if (!kind) return;
    setState("sending");
    setError(null);
    const { error: rpcError } = await createClient().rpc("submit_feedback", {
      kind,
      body: body.trim() || undefined,
      rating: kind === "rating" ? rating : undefined,
      path: from,
      user_agent: navigator.userAgent,
      app_version: APP_VERSION,
    });
    if (rpcError) {
      setState("idle");
      setError(rpcError.hint === "rate_limited" ? "Has enviado varios mensajes seguidos. Prueba dentro de un rato." : "No se ha podido enviar. Inténtalo otra vez.");
      return;
    }
    setState("sent");
    setBody("");
    setRating(0);
    router.refresh();
  }

  if (!kind) return null;
  const current = KINDS.find((option) => option.value === kind)!;
  const ready = kind === "rating" ? rating > 0 : body.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex w-full max-w-md flex-col gap-4 rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {state === "sent" ? (
          <div className="flex flex-col items-start gap-3 py-2 pr-8">
            <h2 id="feedback-title" className="display text-2xl leading-tight font-bold">
              ¡Gracias!
            </h2>
            <p className="text-sm text-muted">
              {kind === "rating"
                ? "Tu valoración nos ayuda a saber si vamos bien."
                : "Lo leemos todo. Verás la respuesta y el estado en tu perfil, en «Tus mensajes»."}
            </p>
            <button type="button" onClick={close} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 id="feedback-title" className="display pr-8 text-2xl leading-tight font-bold">
              ¿Qué nos quieres contar?
            </h2>

            <div role="radiogroup" aria-label="Tipo de mensaje" className="grid grid-flow-col auto-cols-fr rounded-full bg-line/60 p-1">
              {KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={kind === option.value}
                  onClick={() => setKind(option.value)}
                  className={`rounded-full px-2 py-1.5 text-sm transition-colors ${
                    kind === option.value ? "bg-surface font-medium shadow-soft" : "text-muted hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {kind === "rating" && <Stars value={rating} onChange={setRating} />}

            <textarea
              ref={textarea}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              rows={kind === "rating" ? 3 : 5}
              placeholder={current.placeholder}
              aria-label={current.label}
              className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-3 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">{kind === "bug" ? "Se adjunta la pantalla y el navegador." : ""}</p>
              <button
                type="button"
                disabled={!ready || state === "sending"}
                onClick={() => void send()}
                className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-40"
              >
                {state === "sending" ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STAR_LABELS = ["", "Nada", "Poco", "Está bien", "Mucho", "Me encanta"];

function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-col items-center gap-1">
      <div role="radiogroup" aria-label="¿Cuánto te gusta?" className="flex gap-1" onPointerLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
            onClick={() => onChange(star)}
            onPointerEnter={() => setHover(star)}
            className="grid size-12 place-items-center rounded-full transition-transform active:scale-90"
          >
            <svg viewBox="0 0 24 24" className="size-9" aria-hidden>
              <path
                d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"
                fill={star <= shown ? "var(--t256)" : "var(--cell)"}
                stroke={star <= shown ? "var(--t256)" : "var(--line)"}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
      <p aria-live="polite" className="h-5 text-sm text-muted">
        {STAR_LABELS[shown]}
      </p>
    </div>
  );
}
