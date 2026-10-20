export type NavCounts = { home: number; chat: number; friends: number };

export type NavItem = {
  href: string;
  label: string;
  count?: keyof NavCounts;
  countLabel?: (n: number) => string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", count: "home", countLabel: (n: number) => `${n} cosas pendientes` },
  { href: "/chat", label: "Chat", count: "chat", countLabel: (n: number) => `${n} mensajes sin leer` },
  { href: "/ranking", label: "Ranking" },
  { href: "/amigos", label: "Amigos", count: "friends", countLabel: (n: number) => `${n} solicitudes de amistad` },
];

/** La sección está activa en su ruta y en las que cuelgan de ella (salvo Inicio). */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
