"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { brand } from "@repo/brand";
import { canInstall, promptInstall, subscribeInstall } from "./install-store";

const DISMISSED_KEY = "install-prompt:dismissed";
/** Tras cerrarlo, no vuelve a salir en este tiempo. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** Espera tras cargar la página, para no saltar encima de lo primero que se ve. */
const DELAY_MS = 2500;

type Platform = "ios" | "android" | "other" | "desktop";

/** Evento para abrir el tutorial a mano (p. ej. desde los ajustes del perfil). */
const SHOW_EVENT = "show-install-guide";

export function showInstallGuide() {
  window.dispatchEvent(new Event(SHOW_EVENT));
}

function platformOf(): Platform {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac, pero con pantalla táctil.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return /mobile/i.test(ua) ? "other" : "desktop";
}

/** null si no hay que mostrarlo solo (ordenador, app ya instalada o cerrado hace poco). */
function detect(): Platform | null {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  const platform = platformOf();
  if (platform === "desktop" || standalone) return null;
  try {
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY));
    if (dismissed && Date.now() - dismissed < SNOOZE_MS) return null;
  } catch {
    // Sin almacenamiento: se muestra igual (y se podrá cerrar).
  }
  return platform;
}

/**
 * En el móvil, desde el navegador: invita a añadir la app a la pantalla de
 * inicio (en iPhone es además la única forma de recibir avisos), con los
 * pasos de cada sistema. Se puede cerrar y no vuelve a salir en 14 días.
 */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setPlatform(detect()), DELAY_MS);
    // Abierto a mano: se muestra siempre, aunque se cerrara hace poco.
    const show = () => setPlatform(platformOf());
    window.addEventListener(SHOW_EVENT, show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(SHOW_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (!platform) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [platform]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Sin almacenamiento: se cierra igual.
    }
    setPlatform(null);
  }

  async function install() {
    if (await promptInstall()) setPlatform(null);
  }

  if (!platform) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={dismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(event) => event.stopPropagation()}
        className="install-sheet relative flex w-full max-w-md flex-col gap-4 rounded-[1.75rem] bg-surface p-5 pb-6 shadow-lift"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-3 pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
          <div>
            <h2 id="install-title" className="display text-2xl leading-tight font-bold">
              Ten {brand.name} a mano
            </h2>
            <p className="text-sm text-muted">Añádela a la pantalla de inicio: se abre como una app y te avisa cuando te retan.</p>
          </div>
        </div>

        {platform === "ios" ? (
          <ol className="flex flex-col gap-3">
            <Step number={1} icon={<ShareIcon />}>
              Toca <strong>Compartir</strong> en la barra de Safari (abajo, o arriba en el iPad).
            </Step>
            <Step number={2} icon={<AddIcon />}>
              Baja y toca <strong>Añadir a pantalla de inicio</strong>.
            </Step>
            <Step number={3} icon={<span className="text-sm font-bold">OK</span>}>
              Toca <strong>Añadir</strong> arriba a la derecha. Ya la tienes con las demás apps.
            </Step>
          </ol>
        ) : installable ? (
          <button type="button" onClick={() => void install()} className="rounded-full bg-ink px-5 py-3 font-semibold text-bg">
            Instalar la app
          </button>
        ) : platform === "desktop" ? (
          <ol className="flex flex-col gap-3">
            <Step number={1} icon={<AddIcon />}>
              En Chrome o Edge, pulsa el icono de <strong>instalar</strong> que aparece a la derecha de la barra de direcciones.
            </Step>
            <Step number={2} icon={<span className="text-sm font-bold">OK</span>}>
              Confirma con <strong>Instalar</strong>. En Safari del Mac: menú <strong>Archivo</strong> y{" "}
              <strong>Añadir al Dock</strong>.
            </Step>
          </ol>
        ) : (
          <ol className="flex flex-col gap-3">
            <Step number={1} icon={<MenuIcon />}>
              Abre el menú del navegador: <strong>⋮</strong> en Chrome y Firefox, <strong>≡</strong> en Samsung Internet.
            </Step>
            <Step number={2} icon={<AddIcon />}>
              Toca <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong> (en Samsung Internet,{" "}
              <strong>Añadir página a</strong> y luego <strong>Pantalla de inicio</strong>).
            </Step>
            <Step number={3} icon={<span className="text-sm font-bold">OK</span>}>
              Confirma con <strong>Instalar</strong> o <strong>Añadir</strong>.
            </Step>
          </ol>
        )}

        <button type="button" onClick={dismiss} className="self-center text-sm text-muted hover:text-ink">
          Ahora no
        </button>
      </div>
    </div>
  );
}

function Step({ number, icon, children }: { number: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-xl text-ink" style={{ background: "var(--cell)" }}>
        {icon}
        <span className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-bg">
          {number}
        </span>
      </span>
      <span className="text-sm">{children}</span>
    </li>
  );
}

/** Icono de Compartir de Safari: un cuadrado con una flecha hacia arriba. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16" />
      <path d="M12 3v11M8.5 6.5 12 3l3.5 3.5" />
    </svg>
  );
}

/** "Añadir": un cuadrado con un +. */
function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

/** Menú de tres puntos. */
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="currentColor">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </svg>
  );
}
