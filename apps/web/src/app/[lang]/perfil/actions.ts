"use server";

import { redirect } from "next/navigation";
import { getRequestMessages } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PasswordChangeState = { error: string | null; done: boolean };

/** Cambia la contraseña comprobando antes la actual. */
export async function changePassword(_prev: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
  const t = (await getRequestMessages()).account;
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!current) return { done: false, error: t.needCurrent };
  if (password.length < 8) return { done: false, error: t.tooShort };
  if (password !== String(formData.get("password_confirm") ?? "")) return { done: false, error: t.mismatch };
  if (password === current) return { done: false, error: t.same };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { done: false, error: t.expired };

  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { done: false, error: t.wrongCurrent };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { done: false, error: error.code === "weak_password" ? t.weak : t.changeError };
  return { done: true, error: null };
}

export type DeleteAccountState = { error: string | null };

/**
 * Borra la cuenta y todos sus datos (public.delete_account), tras comprobar
 * que quien lo pide sabe el nombre de usuario, el código de amigo y la
 * contraseña. No se puede deshacer.
 */
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const t = (await getRequestMessages()).account;
  const username = String(formData.get("username") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !code || !password) return { error: t.deleteFill };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: t.expired };

  const [{ data: profile }, { data: friendCode }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.from("friend_codes").select("code").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profile?.username.toLowerCase() !== username.toLowerCase() || friendCode?.code !== code) {
    return { error: t.deleteMismatch };
  }
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (wrong) return { error: t.wrongPassword };

  const { error } = await createAdminClient().rpc("delete_account", { target: user.id });
  if (error) {
    console.error("delete_account", error.message);
    return { error: t.deleteError };
  }
  // La cuenta ya no existe: solo queda quitar la sesión de este navegador.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/cuenta-borrada");
}
