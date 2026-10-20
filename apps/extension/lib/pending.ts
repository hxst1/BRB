import { browser } from "wxt/browser";
import { supabase } from "./supabase";

export type Counts = { home: number; chat: number; friends: number };

/** Lo mismo que los avisos de la web: lo pendiente, los mensajes y las solicitudes. */
export async function fetchCounts(): Promise<Counts | null> {
  const client = supabase();
  const { data: session } = await client.auth.getSession();
  if (!session.session) return null;

  const [{ data: pending }, { data: unread }] = await Promise.all([
    client.rpc("get_pending_counts").maybeSingle(),
    client.rpc("get_unread_messages"),
  ]);
  return {
    home: pending ? pending.my_turn + pending.match_invites + pending.challenges : 0,
    chat: unread ?? 0,
    friends: pending?.friend_requests ?? 0,
  };
}

/** El número del icono de la extensión. */
export async function updateBadge(counts: Counts | null) {
  const total = counts ? counts.home + counts.chat + counts.friends : 0;
  await browser.action.setBadgeText({ text: total > 0 ? String(Math.min(total, 99)) : "" });
  await browser.action.setBadgeBackgroundColor({ color: "#ff6b6b" });
}
