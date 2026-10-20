"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "./badge";
import { isActive, NAV_ITEMS, type NavCounts } from "./nav-items";

/** Navegación principal en escritorio (en el móvil va en la barra inferior). */
export function MainNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
            <Badge count={item.count ? counts[item.count] : 0} label={item.count && item.countLabel ? item.countLabel(counts[item.count]) : ""} className="absolute -top-1.5 -right-1" />
          </Link>
        );
      })}
    </nav>
  );
}
