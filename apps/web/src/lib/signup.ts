/** Enlace para crear cuenta (abre "Crear cuenta" en /entrar) y volver después a `next`. */
export function signupHref(next?: string): string {
  return next ? `/entrar?modo=registro&next=${encodeURIComponent(next)}` : "/entrar?modo=registro";
}
