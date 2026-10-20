"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Json } from "@repo/db";
import { Avatar } from "@/components/avatar";
import { Badge } from "./badge";
import { ChatIcon, FriendsIcon, HomeIcon, TrophyIcon } from "./icons";
import { isActive, NAV_ITEMS, type NavCounts } from "./nav-items";

const TAB = "relative flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors";
const TAB_ACTIVE = "bg-ink text-bg";
const TAB_IDLE = "text-muted active:bg-line/60";

const ICONS: Record<string, ReactNode> = {
  "/": <HomeIcon />,
  "/chat": <ChatIcon />,
  "/ranking": <TrophyIcon />,
  "/amigos": <FriendsIcon />,
};

/** Barra de pestañas flotante (una pill) abajo, solo en el móvil. */
export function TabBar({ counts, avatarSeed, avatarParts }: { counts: NavCounts; avatarSeed: number; avatarParts: Json }) {
  const pathname = usePathname();
  const profileActive = isActive(pathname, "/perfil");

  return (
    <nav
      aria-label="Principal"
      className="tab-bar pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden"
    >
      <ul className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-lift backdrop-blur-md">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${TAB} ${active ? TAB_ACTIVE : TAB_IDLE}`}
              >
                {ICONS[item.href]}
                {item.label}
                <Badge
                  count={item.count ? counts[item.count] : 0}
                  label={item.count && item.countLabel ? item.countLabel(counts[item.count]) : ""}
                  className="absolute top-0.5 left-1/2 ml-2"
                />
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/perfil"
            aria-current={profileActive ? "page" : undefined}
            className={`${TAB} ${profileActive ? TAB_ACTIVE : TAB_IDLE}`}
          >
            <Avatar seed={avatarSeed} parts={avatarParts} size={24} />
            Tú
          </Link>
        </li>
      </ul>
    </nav>
  );
}
