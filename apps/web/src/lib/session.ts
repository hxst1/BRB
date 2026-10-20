import "server-only";
import { connection } from "next/server";
import type { Profile } from "@repo/db";
import { createClient } from "@/lib/supabase/server";

export type Viewer = Pick<Profile, "id" | "username" | "avatar_seed" | "avatar_parts" | "xp" | "supporter_tier">;

/** Usuario con sesión iniciada y su perfil, o null. Lee cookies: usar dentro de <Suspense>. */
export async function getViewer(): Promise<Viewer | null> {
  // La sesión es de cada petición: nunca se prerenderiza (y supabase usa Date.now()).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_seed, avatar_parts, xp, supporter_tier")
    .eq("id", userId)
    .maybeSingle();

  return profile;
}
