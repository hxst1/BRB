"use server";

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
