import { browser } from "wxt/browser";
import { SITE_URL } from "./env";

type Pending = { signedIn: false } | { signedIn: true; home: number; chat: number; friends: number };

/** Lo pendiente, con la sesión de la web (app/api/pending): lo mismo que sus avisos. */
export async function fetchTotal(): Promise<number> {
  const response = await fetch(new URL("/api/pending", SITE_URL), { credentials: "include", cache: "no-store" });
  if (!response.ok) return 0;
  const pending = (await response.json()) as Pending;
  return pending.signedIn ? pending.home + pending.chat + pending.friends : 0;
}

/** El número del icono de la extensión. */
export async function updateBadge(total: number) {
  await browser.action.setBadgeText({ text: total > 0 ? String(Math.min(total, 99)) : "" });
  await browser.action.setBadgeBackgroundColor({ color: "#ff6b6b" });
}
