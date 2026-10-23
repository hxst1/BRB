import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // En desarrollo, Next escribe cada server action con sus argumentos en la
  // terminal: aquí pasan contraseñas (entrar, cambiarla, borrar la cuenta).
  logging: { serverFunctions: false },
  async headers() {
    return [
      {
        // El service worker siempre fresco: si se cachea, las actualizaciones tardan en llegar.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
