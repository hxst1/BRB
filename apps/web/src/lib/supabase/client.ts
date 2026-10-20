import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@repo/db";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
