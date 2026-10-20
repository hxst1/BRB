import { brand } from "@repo/brand";

export const SUPABASE_URL = import.meta.env.WXT_SUPABASE_URL ?? "http://127.0.0.1:55321";
export const SUPABASE_KEY = import.meta.env.WXT_SUPABASE_PUBLISHABLE_KEY ?? "";
/** La web: para abrir pantallas y validar partidas del 2048. */
export const SITE_URL = import.meta.env.WXT_SITE_URL ?? brand.defaultUrl;
