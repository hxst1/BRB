import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { fetchCounts, updateBadge } from "@/lib/pending";

/**
 * Proceso de fondo: cada pocos minutos consulta tus pendientes y los pone en
 * el icono, para saber si te toca sin abrir nada. (Un service worker de
 * Manifest V3 no mantiene conexiones abiertas, así que se consulta periódicamente.)
 */
export default defineBackground(() => {
  const refresh = () => fetchCounts().then(updateBadge).catch(() => undefined);

  browser.runtime.onInstalled.addListener(() => {
    void browser.alarms.create("pending", { periodInMinutes: 3 });
    void refresh();
  });
  browser.runtime.onStartup.addListener(() => void refresh());
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pending") void refresh();
  });
  // El popup avisa al entrar, salir o jugar para que el número se actualice ya.
  browser.runtime.onMessage.addListener((message) => {
    if (message === "refresh-badge") void refresh();
  });
});
