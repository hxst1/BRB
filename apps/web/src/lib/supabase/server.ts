import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@repo/db";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/** Cliente con la sesión del usuario: respeta RLS. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente para peticiones con `Authorization: Bearer <token>` (la extensión de
 * Chrome y otros clientes que no comparten las cookies de la web).
 */
export function createTokenClient(accessToken: string) {
  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente con la sesión de la petición, venga por cookie o por token. */
export async function createClientForRequest(request: Request) {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const supabase = accessToken ? createTokenClient(accessToken) : await createClient();
  const { data } = await supabase.auth.getClaims(accessToken);
  return { supabase, userId: data?.claims.sub ?? null };
}
