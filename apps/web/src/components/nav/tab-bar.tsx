"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Json } from "@repo/db";
import { Avatar } from "@repo/ui/avatar";
import { Badge } from "./badge";
import { ChatIcon, FriendsIcon, GamesIcon, HomeIcon, TrophyIcon } from "./icons";
import { isActive, NAV_ITEMS, navTransition, type NavCounts } from "./nav-items";
import { useMessages, usePagePath } from "@/lib/i18n/client";

const ICONS: Record<string, ReactNode> = {
  "/": <HomeIcon />,
  "/juegos": <GamesIcon />,
  "/chat": <ChatIcon />,
  "/ranking": <TrophyIcon />,
  "/amigos": <FriendsIcon />,
};

/**
 * Barra de pestañas flotante (una pill) abajo, solo en el móvil. La pestaña
 * activa la marca un rectángulo de todo el alto que se desliza de una a otra
 * (en las de los extremos rellena la curva: la barra recorta lo que
 * sobresale). Se mueve al tocar, sin esperar a que cargue la página.
 */
export function TabBar({ counts, avatarSeed, avatarParts }: { counts: NavCounts; avatarSeed: number; avatarParts: Json }) {
  const pathname = usePagePath();
  const m = useMessages();
  const tabs = [...NAV_ITEMS.map((item) => item.href), "/perfil"];
  const current = tabs.findIndex((href) => isActive(pathname, href));
  // La pestaña tocada, hasta que llega su página (entonces manda la ruta).
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null);
  const active = tapped && tapped.from === pathname ? tapped.index : current;

  const tab = (index: number, href: string, label: string, icon: ReactNode, badge?: ReactNode) => (
    <li key={href}>
      <Link
        href={href}
        aria-current={index === current ? "page" : undefined}
        transitionTypes={navTransition(current, index)}
        onClick={() => setTapped({ index, from: pathname })}
        className={`relative z-10 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-300 ${
          index === active ? "text-bg" : "text-muted active:text-ink"
        }`}
      >
        {icon}
        {label}
        {badge}
      </Link>
    </li>
  );

  return (
    <nav
      aria-label={m.nav.main}
      className="tab-bar pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden"
    >
      <ul className="pointer-events-auto relative mx-auto grid max-w-md grid-cols-6 overflow-hidden rounded-full border border-line bg-surface/75 shadow-lift backdrop-blur-xl backdrop-saturate-150">
        <span
          aria-hidden
          className="tab-indicator absolute inset-y-0 left-0 bg-ink"
          style={{ width: `${100 / tabs.length}%`, translate: `${Math.max(active, 0) * 100}% 0`, opacity: active < 0 ? 0 : 1 }}
        />
        {NAV_ITEMS.map((item, index) =>
          tab(
            index,
            item.href,
            m.nav[item.label],
            ICONS[item.href],
            <Badge
              count={item.count ? counts[item.count] : 0}
              label={item.count && item.countLabel ? m.nav[item.countLabel](counts[item.count]) : ""}
              className="absolute top-0.5 left-1/2 ml-2"
            />,
          ),
        )}
        {tab(tabs.length - 1, "/perfil", m.nav.me, <Avatar seed={avatarSeed} parts={avatarParts} size={24} />)}
      </ul>
    </nav>
  );
}
