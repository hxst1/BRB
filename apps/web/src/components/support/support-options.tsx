"use client";

import { useEffect, useState } from "react";
import { SUPPORT_LINKS } from "@/lib/support";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/client";
import { InlinePicto } from "@/components/picto";

/**
 * Botones para apoyar el proyecto (Ko-fi y, cuando esté aprobado, GitHub
 * Sponsors). Los usan la página /apoyar y el panel del corazón de la cabecera.
 */
export function SupportOptions() {
  // Tu código de amigo (solo se ve el propio): en el mensaje de Ko-fi asigna el pago aunque el email sea otro.
  const m = useMessages();
  const t = m.support;
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("friend_codes")
      .select("code")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCode(data?.code ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin portapapeles: el código sigue a la vista para copiarlo a mano.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={SUPPORT_LINKS.kofi}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-3.5 font-semibold text-bg transition-transform active:scale-[0.98]"
      >
        <KofiIcon />
        <span className="flex flex-col">
          {t.kofi}
          <span className="text-xs font-normal opacity-70">{t.kofiHint}</span>
        </span>
      </a>
      {SUPPORT_LINKS.githubSponsors && (
        <a
          href={SUPPORT_LINKS.githubSponsors}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3.5 font-semibold transition-transform active:scale-[0.98]"
        >
          <GithubIcon />
          <span className="flex flex-col">
            {t.sponsor}
            <span className="text-xs font-normal text-muted">{t.sponsorHint}</span>
          </span>
        </a>
      )}
      <p className="text-sm text-muted">
        {t.sameEmail}
      </p>
      {code && (
        <div className="flex items-center justify-between gap-3 rounded-2xl p-3" style={{ background: "var(--cell)" }}>
          <p className="text-sm">
            {t.otherEmail}{" "}
            <strong className="tabular tracking-wider">{code}</strong>
          </p>
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-muted"
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1 rounded-2xl border border-line p-3 text-sm">
        <p className="font-semibold">
          <InlinePicto name="laptop" className="mr-1.5" />
          {t.codeTitle}
        </p>
        <p className="text-muted">
          {/* Los espacios van en los textos: en japonés no hay. */}
          {t.codeBefore}
          <a href={SUPPORT_LINKS.githubRepo} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-4">
            GitHub
          </a>
          {code ? (
            <>
              {t.withYourCode}
              <strong className="tabular tracking-wider text-ink">{code}</strong>
            </>
          ) : (
            t.withFriendCode
          )}
          {t.codeAfter}
        </p>
      </div>
    </div>
  );
}

function KofiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M10 11.2c-.9-1-2.4-.4-2.4.8 0 1.3 2.4 2.6 2.4 2.6s2.4-1.3 2.4-2.6c0-1.2-1.5-1.8-2.4-.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  );
}
