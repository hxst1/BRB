"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteUrl } from "@repo/brand";
import { getRequestLocale } from "@/lib/i18n/server";
import { messagesFor } from "@/lib/i18n";
import { INVITE_COOKIE } from "@/lib/invite";
import { recordVisit } from "@/lib/visits";
import { safeNext } from "@/lib/safe-next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error: string | null;
  mode: "signin" | "signup";
  /** Email al que se ha enviado la confirmación (cuando el proyecto la exige). */
  confirmEmail?: string;
  /** Lo que había escrito: React vacía el formulario al enviarlo y, si falla, se vuelve a rellenar. */
  fields?: { username: string; email: string; inviteCode: string; accept: boolean };
};

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export async function authenticate(prev: AuthState, formData: FormData): Promise<AuthState> {
  const fields = {
    username: String(formData.get("username") ?? ""),
    email: String(formData.get("email") ?? ""),
    inviteCode: String(formData.get("invite_code") ?? ""),
    accept: formData.get("accept") === "on",
  };
  return { ...(await attempt(prev, formData)), fields };
}

async function attempt(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = await getRequestLocale();
  const t = messagesFor(locale).auth;
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password) {
    return { mode, error: t.needBoth };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    if (!USERNAME.test(username)) {
      return { mode, error: t.usernameRule };
    }
    if (password.length < 8) {
      return { mode, error: t.tooShort };
    }
    if (password !== String(formData.get("password_confirm") ?? "")) {
      return { mode, error: t.mismatch };
    }
    if (formData.get("accept") !== "on") {
      return { mode, error: t.mustAccept };
    }

    const { data: taken } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
    if (taken) {
      return { mode, error: t.taken(username) };
    }

    // Código de quien le invitó: viene relleno si llegó por su enlace (app/invita/[code]),
    // o lo escribe a mano si abrió el enlace en otro navegador. Lo apunta el disparador
    // de la migración de referrals.
    const invitedBy = String(formData.get("invite_code") ?? "").trim().toUpperCase();
    if (invitedBy) {
      const { data: inviter } = /^[0-9A-Z]{5}$/.test(invitedBy)
        ? await createAdminClient().rpc("user_id_by_friend_code", { code: invitedBy })
        : { data: null };
      if (!inviter) return { mode, error: t.inviteCodeUnknown(invitedBy) };
    }

    const next = safeNext(formData.get("next"));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Constancia del consentimiento: qué versión de cada texto se aceptó y cuándo.
        // `locale`: idioma de los avisos y emails que se le manden.
        data: { username, locale, legal: await acceptedVersions(supabase), ...(invitedBy ? { invited_by: invitedBy } : {}) },
        // El enlace del email de confirmación vuelve aquí con la sesión iniciada.
        emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      return {
        mode,
        error:
          error.code === "user_already_exists"
            ? t.emailExists
            : error.code === "over_email_send_rate_limit"
              ? t.emailRateLimit
              : error.message,
      };
    }
    (await cookies()).delete(INVITE_COOKIE);
    // Para las estadísticas: con la huella del día se sabe de dónde venía quien se registra.
    await recordVisit(await headers(), { kind: "signup", path: "/entrar", lang: locale }).catch(() => undefined);
    // Si el proyecto exige confirmar el email, todavía no hay sesión.
    if (!data.session) return { mode, error: null, confirmEmail: email };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { mode, error: error.code === "invalid_credentials" ? t.invalid : error.message };
    }
  }

  redirect(safeNext(formData.get("next")));
}

/** Versiones de los términos y la privacidad que se aceptan al registrarse. */
async function acceptedVersions(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("legal_documents").select("slug, version").in("slug", ["terminos", "privacidad"]);
  return { accepted_at: new Date().toISOString(), ...Object.fromEntries((data ?? []).map((doc) => [doc.slug, doc.version])) };
}

export async function signOut() {
  const supabase = await createClient();
  // Solo este dispositivo: sin `scope`, Supabase cierra la sesión en todos (salir
  // en el móvil te echaba también del ordenador).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
