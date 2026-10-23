"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@repo/brand";
import { getRequestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type RecoveryState = { error: string | null; sent: boolean };

/**
 * Envía el email para restablecer la contraseña. La respuesta es la misma
 * exista o no la cuenta, para no revelar qué emails están registrados.
 */
export async function requestPasswordReset(_prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const t = (await getRequestMessages()).auth;
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { sent: false, error: t.needEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/entrar/nueva-contrasena`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { sent: false, error: t.emailRateLimit };
  }
  return { sent: true, error: null };
}

export type NewPasswordState = { error: string | null };

export async function updatePassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const t = (await getRequestMessages()).auth;
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: t.tooShort };
  if (password !== String(formData.get("password_confirm") ?? "")) return { error: t.mismatch };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? t.samePassword
          : error.code === "session_not_found" || error.code === "no_authorization"
            ? t.linkExpired
            : t.changeError,
    };
  }
  redirect("/");
}
