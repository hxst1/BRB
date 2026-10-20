import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { Profile } from "@repo/db";
import { createClient } from "@/lib/supabase/server";

export type Viewer = Pick<Profile, "id" | "username" | "avatar_seed" | "avatar_parts" | "xp" | "supporter_tier">;

/**
 * Id del usuario con sesión iniciada, o null. No hace llamadas de red: el token
 * se verifica en el servidor. Lee cookies: usar dentro de <Suspense>.
 * Con cache(), la cabecera y la página comparten el resultado en cada petición.
 */
export const getViewerId = cache(async (): Promise<string | null> => {
  // La sesión es de cada petición: nunca se prerenderiza (y supabase usa Date.now()).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** Usuario con sesión iniciada y su perfil, o null. Lee cookies: usar dentro de <Suspense>. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const userId = await getViewerId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_seed, avatar_parts, xp, supporter_tier")
    .eq("id", userId)
    .maybeSingle();

  return profile;
});
