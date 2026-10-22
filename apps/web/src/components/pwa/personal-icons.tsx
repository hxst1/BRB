"use client";

import { useEffect } from "react";
import { renderMonsterSvg, resolveMonster } from "@repo/avatars";
import type { Json } from "@repo/db";
import { ICON_VERSION, monsterCode } from "@/lib/monster-code";

/**
 * Con sesión, los iconos de la app son tu monstruo: el de la pestaña (al
 * momento) y los que se copian al instalar la app (iPhone y manifiesto). Al
 * cerrar sesión vuelve la mascota.
 *
 * Next vuelve a pintar las etiquetas del <head> al navegar, así que se vigila
 * el <head> y se reaplican cuando cambian.
 */
export function PersonalIcons({ avatarSeed, avatarParts }: { avatarSeed: number; avatarParts: Json }) {
  useEffect(() => {
    const code = encodeURIComponent(monsterCode(avatarSeed, avatarParts));
    const favicon = `data:image/svg+xml,${encodeURIComponent(renderMonsterSvg(resolveMonster(avatarSeed, avatarParts)))}`;
    const wanted: [string, Record<string, string>][] = [
      ['link[rel="icon"]', { href: favicon, type: "image/svg+xml" }],
      ['link[rel="apple-touch-icon"]', { href: `/icons/me/apple-180.png?m=${code}&v=${ICON_VERSION}` }],
      ['link[rel="manifest"]', { href: `/me.webmanifest?m=${code}&v=${ICON_VERSION}` }],
    ];
    // Valores originales de cada etiqueta, para devolverlos al cerrar sesión.
    const originals = new Map<HTMLLinkElement, Record<string, string | null>>();

    const apply = () => {
      for (const [selector, attributes] of wanted) {
        for (const link of document.head.querySelectorAll<HTMLLinkElement>(selector)) {
          for (const [name, value] of Object.entries(attributes)) {
            if (link.getAttribute(name) === value) continue;
            const saved = originals.get(link) ?? {};
            if (!(name in saved)) saved[name] = link.getAttribute(name);
            originals.set(link, saved);
            link.setAttribute(name, value);
          }
        }
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });

    return () => {
      observer.disconnect();
      for (const [link, saved] of originals) {
        for (const [name, value] of Object.entries(saved)) {
          if (value === null) link.removeAttribute(name);
          else link.setAttribute(name, value);
        }
      }
    };
  }, [avatarSeed, avatarParts]);

  return null;
}
