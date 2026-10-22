"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PasswordChangeState = { error: string | null; done: boolean };

/** Cambia la contraseña comprobando antes la actual. */
export async function changePassword(_prev: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!current) return { done: false, error: "Escribe tu contraseña actual." };
  if (password.length < 8) return { done: false, error: "La nueva contraseña necesita al menos 8 caracteres." };
  if (password !== String(formData.get("password_confirm") ?? "")) return { done: false, error: "Las contraseñas nuevas no coinciden." };
  if (password === current) return { done: false, error: "La nueva contraseña tiene que ser distinta de la actual." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { done: false, error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { done: false, error: "La contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { done: false, error: error.code === "weak_password" ? "Esa contraseña es demasiado fácil. Prueba con otra." : "No se ha podido cambiar. Inténtalo otra vez." };
  return { done: true, error: null };
}

export type DeleteAccountState = { error: string | null };

/**
 * Borra la cuenta y todos sus datos (public.delete_account), tras comprobar
 * que quien lo pide sabe el nombre de usuario, el código de amigo y la
 * contraseña. No se puede deshacer.
 */
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const username = String(formData.get("username") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !code || !password) return { error: "Rellena tu nombre de usuario, tu código de amigo y tu contraseña." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const [{ data: profile }, { data: friendCode }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.from("friend_codes").select("code").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profile?.username.toLowerCase() !== username.toLowerCase() || friendCode?.code !== code) {
    return { error: "El nombre de usuario o el código de amigo no coinciden con los de tu cuenta." };
  }
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (wrong) return { error: "La contraseña no es correcta." };

  const { error } = await createAdminClient().rpc("delete_account", { target: user.id });
  if (error) {
    console.error("delete_account", error.message);
    return { error: "No se ha podido borrar la cuenta. Inténtalo otra vez o escríbenos." };
  }
  // La cuenta ya no existe: solo queda quitar la sesión de este navegador.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/cuenta-borrada");
}
