import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { isLocale, LOCALE_COOKIE, pickLocale } from "@/lib/i18n/locales";

/** Lo que no es una página (no va bajo app/[lang]). */
const NOT_PAGES = /^\/(?:api|auth|icons|invita|llms\.txt|me\.webmanifest|offline|sw\.js|robots\.txt|sitemap\.xml|icon|apple-icon|manifest\.webmanifest)(?:\/|$)/;

/**
 * Las páginas viven en app/[lang]: aquí se elige el idioma (el de Ajustes o el
 * del navegador) y se reescribe por dentro a /es/… o /en/…, sin cambiar la URL.
 * Quien entra con el idioma en la URL vuelve a la URL normal con ese idioma elegido.
 */
function localize(request: NextRequest): { rewrite?: URL; redirect?: URL; locale?: string } {
  const { pathname } = request.nextUrl;
  if (NOT_PAGES.test(pathname)) return {};
  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(first.length + 1) || "/";
    return { redirect: url, locale: first };
  }
  const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return { rewrite: url };
}

function pass(request: NextRequest, rewrite: URL | undefined) {
  return rewrite ? NextResponse.rewrite(rewrite, { request }) : NextResponse.next({ request });
}

/** Refresca la sesión de Supabase en cada petición para que no caduque a mitad de partida. */
export async function proxy(request: NextRequest) {
  const { rewrite, redirect, locale } = localize(request);
  if (redirect) {
    const response = NextResponse.redirect(redirect);
    response.cookies.set(LOCALE_COOKIE, locale!, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }

  let response = pass(request, rewrite);

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = pass(request, rewrite);
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // No meter código entre la creación del cliente y getClaims: es lo que refresca el token.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
