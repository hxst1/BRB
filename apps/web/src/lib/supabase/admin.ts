import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@repo/db";
import { supabaseUrl } from "@/lib/env";

/**
 * Cliente con la secret key: se salta RLS. Solo para lo que el usuario no
 * puede hacer por sí mismo (cerrar partidas validadas, webhooks de pago…).
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Falta la variable de entorno SUPABASE_SECRET_KEY");

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
