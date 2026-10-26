import { brand } from "@repo/brand";

/** La web que se muestra (y a la que se piden los pendientes). */
export const SITE_URL = import.meta.env.WXT_SITE_URL ?? brand.defaultUrl;
export const SITE_ORIGIN = new URL(SITE_URL).origin;
