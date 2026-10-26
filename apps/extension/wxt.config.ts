import { defineConfig } from "wxt";
import { brand } from "@repo/brand";

/**
 * Extensión de Chrome: la web entera en la ventanita del icono (y, con el clic
 * derecho, en una ventana propia), así que tiene siempre los mismos juegos que
 * la web sin publicar nada aparte. El número del icono son tus pendientes.
 */
export default defineConfig({
  manifest: ({ mode }) => {
    const siteUrl = process.env.WXT_SITE_URL ?? brand.defaultUrl;
    return {
      name: mode === "development" ? `${brand.name} (dev)` : brand.name,
      description: brand.description,
      permissions: ["storage", "alarms", "contextMenus"],
      // Con permiso sobre la web, Chrome la trata como propia dentro de la
      // extensión: la sesión de la web vale en el iframe y en las peticiones.
      host_permissions: [`${new URL(siteUrl).origin}/*`],
      action: { default_title: brand.name },
    };
  },
});
