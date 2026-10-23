"use client";

import { useEffect, useState } from "react";
import { renderMonsterSvg, resolveMonster } from "@repo/avatars";
import { messagesFor } from "@/lib/i18n";
import { LOCALE_COOKIE, pickLocale } from "@/lib/i18n/locales";
import { reportError } from "@/lib/report-error";

/** Aquí no llega el idioma del layout: se elige igual que en proxy.ts. */
function browserLocale() {
  if (typeof document === "undefined") return "es";
  const cookie = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))?.[1];
  return pickLocale(cookie, navigator.languages.join(","));
}

/**
 * Falla el propio layout: esta pantalla sustituye a todo (sin estilos de la
 * app), así que lleva los suyos, con los colores del tema. Mismo diseño que
 * el resto de errores y que la página sin conexión.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const [locale] = useState(browserLocale);
  const m = messagesFor(locale);
  useEffect(() => {
    const fromServer = typeof error === "object" && error !== null && "digest" in error && Boolean((error as { digest?: string }).digest);
    if (!fromServer) reportError(error);
  }, [error]);

  return (
    <html lang={locale}>
      <head>
        <title>{m.errors.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style>{STYLES}</style>
      </head>
      <body>
        <main>
          <div className="tiles" aria-hidden>
            {[...TILES].map(([digit, background, color], i) => (
              <span key={i} className="tile" style={{ background, color, animationDelay: `${i * 110}ms` }}>
                {digit}
              </span>
            ))}
          </div>
          <div className="monster" aria-hidden dangerouslySetInnerHTML={{ __html: MONSTER }} />
          <h1>{m.errors.title}</h1>
          <p>{m.errors.bodyShort}</p>
          <button type="button" onClick={() => retry()}>
            {m.errors.retry}
          </button>
        </main>
      </body>
    </html>
  );
}

/** Fichas del 2048 con el código, como en el resto de páginas de error. */
const TILES = [
  ["5", "#ff6b6b", "#ffffff"],
  ["0", "#845ef7", "#ffffff"],
  ["0", "#845ef7", "#ffffff"],
] as const;

const MONSTER = renderMonsterSvg(resolveMonster(7, { body: "ghost", palette: "sky", eyes: "two", mouth: "wobbly", top: "antenna" }), "sad");

/** Sin el CSS de la app (ha fallado el layout): los estilos van aquí, con los colores del tema. */
const STYLES = `
  :root { --bg: #f3f4f7; --ink: #15171c; --muted: #6a7080; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111318; --ink: #f1f2f5; --muted: #959bab; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
  main { max-width: 24rem; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .tiles { display: flex; gap: 10px; }
  .tile { width: 72px; height: 72px; border-radius: 22%; display: grid; place-items: center; font-size: 44px; font-weight: 800;
    animation: drop 520ms cubic-bezier(0.3, 1.5, 0.5, 1) backwards; }
  .monster { width: 104px; height: 104px; animation: rise 500ms ease-out 380ms backwards; }
  h1 { margin: 0; font-size: 2.25rem; letter-spacing: -0.03em; }
  p { margin: 0; color: var(--muted); line-height: 1.5; }
  button { border: 0; border-radius: 999px; padding: 12px 22px; font: inherit; font-weight: 600;
    background: var(--ink); color: var(--bg); cursor: pointer; }
  @keyframes drop { from { transform: translateY(-60%) scale(0.6); opacity: 0; } }
  @keyframes rise { from { transform: translateY(18px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .tile, .monster { animation: none; } }
`;
