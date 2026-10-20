import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { browser } from "wxt/browser";
import type { Database } from "@repo/db";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * La sesión se guarda en el almacenamiento de la extensión, compartido entre
 * el popup y el proceso de fondo (el popup se destruye cada vez que se cierra).
 */
const storage = {
  async getItem(key: string) {
    const items = await browser.storage.local.get(key);
    return (items[key] as string | undefined) ?? null;
  },
  async setItem(key: string, value: string) {
    await browser.storage.local.set({ [key]: value });
  },
  async removeItem(key: string) {
    await browser.storage.local.remove(key);
  },
};

let client: SupabaseClient<Database> | null = null;

export function supabase(): SupabaseClient<Database> {
  client ??= createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
