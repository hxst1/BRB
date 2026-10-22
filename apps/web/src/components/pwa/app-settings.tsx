"use client";

import { useSyncExternalStore } from "react";
import { brand } from "@repo/brand";
import { showInstallGuide } from "./install-prompt";
import { canInstall, promptInstall, subscribeInstall } from "./install-store";
import { usePushNotifications } from "./push";

/** Instalar la app y activar las notificaciones en este dispositivo. */
export function AppSettings() {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  const { env, push, busy, error, enable, disable } = usePushNotifications();

  return (
    <section aria-labelledby="app-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <h2 id="app-title" className="font-semibold">
        La app
      </h2>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Notificaciones</p>
        <p className="text-sm text-muted">Te avisamos cuando te toca, te escriben o te retan, aunque tengas la app cerrada.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {push === "loading" && <span className="h-9 w-40 animate-pulse rounded-full bg-line/60" />}
          {push === "off" && (
            <button type="button" disabled={busy} onClick={() => void enable()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50">
              Activar notificaciones
            </button>
          )}
          {push === "on" && (
            <>
              <span className="text-sm">Activadas en este dispositivo.</span>
              <button type="button" disabled={busy} onClick={() => void disable()} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                Desactivar
              </button>
            </>
          )}
          {push === "denied" && (
            <span className="text-sm text-muted">
              Las tienes bloqueadas para esta web. Permítelas en los ajustes del navegador y vuelve aquí.
            </span>
          )}
          {push === "ios-install" && (
            <span className="text-sm text-muted">En iPhone, primero añade la app a la pantalla de inicio (abajo te explicamos cómo).</span>
          )}
          {push === "unsupported" && <span className="text-sm text-muted">Este navegador no admite notificaciones.</span>}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      {env && !env.standalone && (
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <p className="text-sm font-medium">Instalar {brand.name}</p>
          <p className="text-sm text-muted">Tenla en tu pantalla de inicio y ábrela como una app más.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {installable && (
              <button type="button" onClick={() => void promptInstall()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted">
                Instalar la app
              </button>
            )}
            <button type="button" onClick={showInstallGuide} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted">
              Ver cómo instalarla
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
