import { cookies } from "next/headers";
import { INVITE_COOKIE } from "@/lib/invite";
import { getViewerId } from "@/lib/session";

/**
 * Enlace de invitación: /invita/<código de amigo>. Guarda el código 30 días;
 * al registrarse, quien invitó queda apuntado y pasan a ser amigos (ver la
 * migración de referrals). Con cuenta, lleva a añadir a ese amigo como siempre.
 */
export async function GET(request: Request, { params }: RouteContext<"/invita/[code]">) {
  const code = (await params).code.trim().toUpperCase();
  const origin = new URL(request.url).origin;
  if (!/^[0-9A-Z]{5}$/.test(code)) return Response.redirect(new URL("/", origin), 307);

  if (await getViewerId()) return Response.redirect(new URL(`/amigos?codigo=${code}`, origin), 307);

  (await cookies()).set(INVITE_COOKIE, code, {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return Response.redirect(new URL("/entrar?modo=registro", origin), 307);
}
