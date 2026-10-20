"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { brand } from "@repo/brand";
import { createClient } from "@/lib/supabase/client";
import { canInstall, promptInstall, subscribeInstall } from "./install-store";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function detectEnvironment() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { standalone, ios };
}

/** Instalar la app y activar las notificaciones en este dispositivo. */
export function AppSettings() {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  const [env, setEnv] = useState<{ standalone: boolean; ios: boolean } | null>(null);
  const [push, setPush] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const environment = detectEnvironment();
    let cancelled = false;
    (async () => {
      let state: PushState;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // En iPhone las notificaciones solo existen con la app instalada.
        state = environment.ios && !environment.standalone ? "ios-install" : "unsupported";
      } else if (Notification.permission === "denied") {
        state = "denied";
      } else {
        const registration = await navigator.serviceWorker.ready;
        state = (await registration.pushManager.getSubscription()) ? "on" : "off";
      }
      if (!cancelled) {
        setEnv(environment);
        setPush(state);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const json = subscription.toJSON();
      const { error: saveError } = await createClient().rpc("save_push_subscription", {
        endpoint: subscription.endpoint,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
      });
      if (saveError) {
        await subscription.unsubscribe();
        throw saveError;
      }
      setPush("on");
    } catch {
      setError("No se han podido activar. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await createClient().rpc("delete_push_subscription", { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    setPush("off");
    setBusy(false);
  }

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

      {env && !env.standalone && (installable || env.ios) && (
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <p className="text-sm font-medium">Instalar {brand.name}</p>
          {installable ? (
            <>
              <p className="text-sm text-muted">Tenla en tu pantalla de inicio y ábrela como una app más.</p>
              <button type="button" onClick={() => void promptInstall()} className="mt-2 self-start rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted">
                Instalar la app
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">
              En Safari, toca <span aria-hidden>⎙</span> <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
