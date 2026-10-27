export type NavCounts = { home: number; chat: number; friends: number };

/** `label` y `countLabel`: claves de m.nav (lib/i18n). */
export type NavItem = {
  href: string;
  label: "home" | "games" | "chat" | "ranking" | "friends";
  count?: keyof NavCounts;
  countLabel?: "pending" | "unread" | "requests";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "home", count: "home", countLabel: "pending" },
  { href: "/juegos", label: "games" },
  { href: "/chat", label: "chat", count: "chat", countLabel: "unread" },
  { href: "/ranking", label: "ranking" },
  { href: "/amigos", label: "friends", count: "friends", countLabel: "requests" },
];

/**
 * Tipo de transición al ir de una sección a otra de la navegación: la página
 * nueva entra por el lado en que está su pestaña (ver app/[lang]/template.tsx).
 * Sin sección de partida (otra página), sin dirección: un fundido.
 */
export function navTransition(from: number, to: number): string[] | undefined {
  if (from < 0 || from === to) return undefined;
  return [to > from ? "nav-forward" : "nav-back"];
}

/** La sección está activa en su ruta y en las que cuelgan de ella (salvo Inicio). */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
