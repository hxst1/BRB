/**
 * Pista de si hay sesión, solo para elegir el esqueleto de carga (el de la
 * portada con sesión o la presentación, la lista de partidas o el aviso de
 * entrar…) antes de que el servidor lo sepa: data-session en <html> si
 * existe la cookie de Supabase. No dice si la sesión es válida; basta para
 * que, casi siempre, el esqueleto se parezca a lo que llega.
 *
 * Va también, como texto, en el script del <head>: no puede depender de nada de fuera.
 */
export function applySessionHint() {
  document.documentElement.toggleAttribute("data-session", /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie));
}

export const SESSION_HINT_SCRIPT = `(function(){try{(${applySessionHint.toString()})()}catch(e){}})()`;
