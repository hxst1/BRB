"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; mode: "signin" | "signup" };

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password) {
    return { mode, error: "Escribe tu email y tu contraseña." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    if (!USERNAME.test(username)) {
      return { mode, error: "El nombre debe tener de 3 a 20 letras, números o guiones bajos." };
    }
    if (password.length < 8) {
      return { mode, error: "La contraseña necesita al menos 8 caracteres." };
    }
    if (password !== String(formData.get("password_confirm") ?? "")) {
      return { mode, error: "Las contraseñas no coinciden." };
    }

    const { data: taken } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
    if (taken) {
      return { mode, error: `«${username}» ya está cogido. Prueba con otro nombre.` };
    }

    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) {
      return { mode, error: error.code === "user_already_exists" ? "Ya hay una cuenta con ese email. Entra con ella." : error.message };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { mode, error: error.code === "invalid_credentials" ? "El email o la contraseña no coinciden." : error.message };
    }
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
