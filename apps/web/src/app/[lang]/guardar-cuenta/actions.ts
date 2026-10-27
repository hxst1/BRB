"use server";

import { getRequestLocale } from "@/lib/i18n/server";
import { messagesFor } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error: string | null; saved?: boolean; fields?: { username: string; email: string } };

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Guarda la cuenta de invitado: le pone email y contraseña (es el mismo
 * usuario, así que conserva amigos, partidas y logros) y, si lo cambia, el nombre.
 */
export async function saveGuestAccount(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const t = messagesFor(await getRequestLocale()).saveAccount;
  const fields = { username: String(formData.get("username") ?? "").trim(), email: String(formData.get("email") ?? "").trim() };
  const password = String(formData.get("password") ?? "");
  if (!USERNAME.test(fields.username)) return { error: t.usernameRule, fields };
  if (password.length < 8) return { error: t.passwordRule, fields };
  if (password !== String(formData.get("repeat") ?? "")) return { error: t.passwordsDiffer, fields };
  if (formData.get("accept") !== "on") return { error: t.acceptRequired, fields };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId || claims?.claims.is_anonymous !== true) return { error: t.notGuest, fields };

  const { data: docs } = await supabase.from("legal_documents").select("slug, version").in("slug", ["terminos", "privacidad"]);
  const legal = { accepted_at: new Date().toISOString(), ...Object.fromEntries((docs ?? []).map((doc) => [doc.slug, doc.version])) };
  const { error } = await supabase.auth.updateUser({ email: fields.email, password, data: { legal } });
  if (error) {
    return { error: error.code === "email_exists" || error.code === "user_already_exists" ? t.emailExists : error.message, fields };
  }

  // El token aún dice que es anónima: uno nuevo, para que la app deje de tratarla como invitada.
  await supabase.auth.refreshSession();

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).single();
  if (profile && profile.username !== fields.username) {
    const { error: renameError } = await supabase.from("profiles").update({ username: fields.username }).eq("id", userId);
    // La cuenta ya está guardada: si el nombre está cogido, se puede cambiar luego en el perfil.
    if (renameError) return { error: null, saved: true, fields: { ...fields, username: profile.username } };
  }
  return { error: null, saved: true, fields };
}
