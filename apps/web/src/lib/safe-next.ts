const BASE = "http://internal.invalid";

/**
 * Ruta interna a la que volver tras entrar. Cualquier cosa que el navegador
 * pudiera interpretar como otro dominio (`//x`, `/\x`, tabuladores…) cae en "/".
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  // Los navegadores tratan "\" como "/" e ignoran tabuladores y saltos de línea.
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return "/";

  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
