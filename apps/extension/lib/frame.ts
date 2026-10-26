import { browser } from "wxt/browser";
import { SITE_ORIGIN, SITE_URL } from "./env";

const LAST_PATH = "lastPath";

/**
 * Muestra la web en un iframe que ocupa toda la página (la ventanita del icono
 * o la ventana propia). Vuelve a la última pantalla en la que se estuvo: la
 * web la cuenta con postMessage (components/extension-bridge).
 */
export async function mountSite(container: HTMLElement) {
  const stored = (await browser.storage.local.get(LAST_PATH))[LAST_PATH];
  // Solo rutas de la propia web ("/sudoku", no "//otra.web").
  const path = typeof stored === "string" && /^\/(?!\/)/.test(stored) ? stored : "/";

  const frame = document.createElement("iframe");
  frame.src = new URL(path, SITE_URL).href;
  frame.title = document.title;
  frame.allow = "clipboard-write; web-share";
  frame.addEventListener("load", () => document.body.classList.add("loaded"));
  container.append(frame);

  window.addEventListener("message", (event) => {
    if (event.origin !== SITE_ORIGIN || event.source !== frame.contentWindow) return;
    const data = event.data as { type?: unknown; path?: unknown };
    if (data?.type === "brb:path" && typeof data.path === "string" && /^\/(?!\/)/.test(data.path)) {
      void browser.storage.local.set({ [LAST_PATH]: data.path });
    }
  });
}
