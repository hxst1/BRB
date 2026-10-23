import { NextResponse, type NextRequest } from "next/server";

/**
 * Destino de los enlaces de los emails (confirmar la cuenta, restablecer la
 * contraseña) y de los que genera el panel de admin con auth.admin.generateLink.
 *
 * No verifica nada al abrirse: los antivirus y las apps de correo abren los
 * enlaces antes que la persona y gastarían el token (de un solo uso), que
 * luego le saldría caducado. Lleva a una página con un botón que lo verifica.
 */
export function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const url = new URL("/entrar/confirmar", origin);
  for (const key of ["token_hash", "type", "next"]) {
    const value = searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}
