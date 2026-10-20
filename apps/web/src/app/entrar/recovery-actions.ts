"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@repo/brand";
import { createClient } from "@/lib/supabase/server";

export type RecoveryState = { error: string | null; sent: boolean };

/**
 * Envía el email para restablecer la contraseña. La respuesta es la misma
 * exista o no la cuenta, para no revelar qué emails están registrados.
 */
export async function requestPasswordReset(_prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { sent: false, error: "Escribe el email de tu cuenta." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/entrar/nueva-contrasena`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { sent: false, error: "Hemos enviado demasiados emails seguidos. Espera un poco y vuelve a intentarlo." };
  }
  return { sent: true, error: null };
}

export type NewPasswordState = { error: string | null };

export async function updatePassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };
  if (password !== String(formData.get("password_confirm") ?? "")) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Esa ya es tu contraseña. Elige otra distinta."
          : error.code === "session_not_found" || error.code === "no_authorization"
            ? "El enlace ha caducado. Pide uno nuevo."
            : "No se ha podido cambiar la contraseña. Inténtalo otra vez.",
    };
  }
  redirect("/");
}
