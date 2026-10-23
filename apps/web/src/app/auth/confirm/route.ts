import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/** Tipos de enlace que se aceptan aquí. */
const TYPES: readonly EmailOtpType[] = ["recovery", "email", "signup"];

/**
 * Destino de los enlaces con `token_hash` (p. ej. el de restablecer la
 * contraseña que genera el panel de admin con auth.admin.generateLink):
 * verifica el token, deja la sesión iniciada y lleva a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/entrar/recuperar?error=enlace", origin));
}
