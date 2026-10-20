import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import { brand } from "@repo/brand";

/**
 * Extensión de Chrome: popup con tus pendientes y un 2048 rápido, y un aviso
 * en el icono. Habla con Supabase y con la web (para validar partidas).
 */
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ mode }) => {
    const supabaseUrl = process.env.WXT_SUPABASE_URL ?? "http://127.0.0.1:55321";
    const siteUrl = process.env.WXT_SITE_URL ?? brand.defaultUrl;
    return {
      name: mode === "development" ? `${brand.name} (dev)` : brand.name,
      description: brand.description,
      permissions: ["storage", "alarms"],
      // Sin estos permisos el popup no podría llamar a la API (CORS).
      host_permissions: [`${new URL(supabaseUrl).origin}/*`, `${new URL(siteUrl).origin}/*`],
      action: { default_title: brand.name },
    };
  },
});
