/**
 * Única fuente de verdad de la marca.
 *
 * El nombre definitivo aún no está decidido: para renombrar la app basta con
 * cambiar este fichero (y `NEXT_PUBLIC_SITE_URL` cuando haya dominio).
 * Ningún otro paquete debe escribir el nombre a mano.
 */
export const brand = {
  /** Nombre corto: logo, título de pestaña, nombre de la PWA en el móvil. */
  name: "BRB",
  /** Lo que significan las siglas. */
  expansion: "Be Right Back",
  tagline: "Vuelvo enseguida. O no.",
  description:
    "Minijuegos rápidos para procrastinar: rankings, retos y partidas contra tus amigos.",
  /** Dominio de producción provisional; se sobrescribe con NEXT_PUBLIC_SITE_URL. */
  defaultUrl: "http://localhost:4321",
  themeColor: "#f3f4f7",
  themeColorDark: "#111318",
} as const;

export type Brand = typeof brand;

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? brand.defaultUrl;
}
