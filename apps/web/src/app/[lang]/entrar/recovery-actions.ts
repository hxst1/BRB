"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { siteUrl } from "@repo/brand";
import { getRequestMessages } from "@/lib/i18n/server";
import { safeNext } from "@/lib/safe-next";
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

/** Tipos de enlace que se aceptan (ver app/auth/confirm). */
const LINK_TYPES: readonly EmailOtpType[] = ["recovery", "email", "signup"];

/**
 * Botón de /entrar/confirmar: verifica el token del email, deja la sesión
 * iniciada y lleva a `next`. Vale en cualquier navegador o dispositivo.
 */
export async function verifyEmailLink(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const recovery = type === "recovery";

  if (tokenHash && LINK_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(safeNext(String(formData.get("next") ?? "/")));
  }
  // Uno de confirmar la cuenta que ya no vale suele ser porque ya se usó: a entrar.
  redirect(recovery ? "/entrar/recuperar?error=enlace" : "/entrar");
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
