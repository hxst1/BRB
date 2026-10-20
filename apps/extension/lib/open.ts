import { browser } from "wxt/browser";
import { SITE_URL } from "./env";

/** Abre una pantalla de la web en una pestaña nueva y cierra el popup. */
export async function openSite(path: string) {
  await browser.tabs.create({ url: new URL(path, SITE_URL).href });
  window.close();
}
