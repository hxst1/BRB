import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { SITE_URL } from "@/lib/env";
import { fetchTotal, updateBadge } from "@/lib/pending";

/**
 * Proceso de fondo: cada pocos minutos pone tus pendientes en el icono (un
 * service worker de Manifest V3 no mantiene conexiones abiertas, así que se
 * consulta), y el clic derecho en el icono abre la app en una ventana propia
 * (no se cierra al pulsar fuera, como la ventanita) o en una pestaña.
 */
const es = navigator.language.toLowerCase().startsWith("es");
const MENU = {
  window: es ? "Abrir en una ventana" : "Open in a window",
  tab: es ? "Abrir en una pestaña" : "Open in a tab",
};

/** Tamaño de la ventana propia: como un móvil, para que la web se vea con su barra de abajo. */
const WINDOW = { width: 430, height: 820 };

let appWindow: number | null = null;

async function openWindow() {
  // Si ya está abierta, se trae delante en vez de abrir otra.
  if (appWindow !== null) {
    const open = await browser.windows.get(appWindow).catch(() => null);
    if (open) return void browser.windows.update(appWindow, { focused: true });
  }
  const created = await browser.windows.create({ url: browser.runtime.getURL("/window.html"), type: "popup", ...WINDOW });
  appWindow = created?.id ?? null;
}

export default defineBackground(() => {
  const refresh = () => fetchTotal().then(updateBadge).catch(() => undefined);

  browser.runtime.onInstalled.addListener(() => {
    void browser.alarms.create("pending", { periodInMinutes: 3 });
    browser.contextMenus.create({ id: "window", title: MENU.window, contexts: ["action"] });
    browser.contextMenus.create({ id: "tab", title: MENU.tab, contexts: ["action"] });
    void refresh();
  });
  browser.runtime.onStartup.addListener(() => void refresh());
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pending") void refresh();
  });
  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "window") void openWindow();
    if (info.menuItemId === "tab") void browser.tabs.create({ url: SITE_URL });
  });
  // Al abrir la ventanita, el número se pone al día.
  browser.runtime.onMessage.addListener((message) => {
    if (message === "refresh-badge") void refresh();
  });
});
