"use client";

/**
 * Script en línea que se ejecuta antes de pintar (p. ej. el del tema). En el
 * servidor sale como JavaScript; en el navegador, como texto, porque React
 * no ejecuta scripts que pinta él y avisaría en desarrollo cuando vuelve a
 * pintar el layout (el 404 o un error). Ver la guía "Preventing flash
 * before hydration" de Next.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
