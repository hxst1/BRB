import type { Instrumentation } from "next";

/**
 * Errores del servidor (renderizado, rutas, acciones): se guardan para el
 * panel de admin igual que los del navegador, con source = 'server'.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const err = error instanceof Error ? error : new Error(String(error));
    const digest = typeof error === "object" && error !== null && "digest" in error ? ` (${String(error.digest)})` : "";
    await createAdminClient().rpc("report_app_error", {
      message: `${err.name}: ${err.message}`.slice(0, 1000),
      stack: `${err.stack ?? ""}\n[${context.routeType}] ${context.routePath}${digest}`.slice(0, 8000),
      path: request.path.split("?")[0]?.slice(0, 300),
      user_agent: (Array.isArray(request.headers["user-agent"]) ? request.headers["user-agent"][0] : request.headers["user-agent"])?.slice(0, 400),
      app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      source: "server",
    });
  } catch {
    // Si falla el aviso, que no tape el error original.
  }
};
