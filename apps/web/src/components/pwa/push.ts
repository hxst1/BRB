"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/client";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function detectEnvironment() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { standalone, ios };
}

/** Estado de las notificaciones en este dispositivo, y activarlas o desactivarlas. */
export function usePushNotifications() {
  const m = useMessages();
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
      setError(m.settings.pushError);
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

  return { env, push, busy, error, enable, disable };
}
