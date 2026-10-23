"use client";

import { useSyncExternalStore } from "react";
import { brand } from "@repo/brand";
import { showInstallGuide } from "./install-prompt";
import { LanguagePicker } from "./language-picker";
import { ThemePicker } from "./theme-picker";
import { TintPicker } from "./tint-picker";
import { canInstall, promptInstall, subscribeInstall } from "./install-store";
import { usePushNotifications } from "./push";
import { useMessages } from "@/lib/i18n/client";

/** Tema, notificaciones e instalar la app en este dispositivo. */
export function AppSettings({ isSupporter = false, unlocked = [] }: { isSupporter?: boolean; unlocked?: readonly string[] }) {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  const { env, push, busy, error, enable, disable } = usePushNotifications();
  const m = useMessages();
  const t = m.settings;

  return (
    <section aria-labelledby="app-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft">
      <h2 id="app-title" className="font-semibold">
        {t.app}
      </h2>

      <LanguagePicker />
      <ThemePicker />
      <TintPicker isSupporter={isSupporter} unlocked={unlocked} />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t.notifications}</p>
        <p className="text-sm text-muted">{t.notificationsHint}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {push === "loading" && <span className="h-9 w-40 animate-pulse rounded-full bg-line/60" />}
          {push === "off" && (
            <button type="button" disabled={busy} onClick={() => void enable()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50">
              {t.enable}
            </button>
          )}
          {push === "on" && (
            <>
              <span className="text-sm">{t.enabled}</span>
              <button type="button" disabled={busy} onClick={() => void disable()} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                {t.disable}
              </button>
            </>
          )}
          {push === "denied" && (
            <span className="text-sm text-muted">
              {t.denied}
            </span>
          )}
          {push === "ios-install" && (
            <span className="text-sm text-muted">{t.iosInstall}</span>
          )}
          {push === "unsupported" && <span className="text-sm text-muted">{t.unsupported}</span>}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      {env && !env.standalone && (
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <p className="text-sm font-medium">{t.install(brand.name)}</p>
          <p className="text-sm text-muted">{t.installHint}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {installable && (
              <button type="button" onClick={() => void promptInstall()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted">
                {m.install.install}
              </button>
            )}
            <button type="button" onClick={showInstallGuide} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted">
              {t.howToInstall}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
