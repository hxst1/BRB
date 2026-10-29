"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

/** Sección del juego en la página del reto (app/[lang]/reto-diario). */
const PLAY_ID = "jugar";

function scrollToPlay() {
  document.getElementById(PLAY_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Si aún no ha empezado, el siguiente paso es "Empezar el reto": queda a mano con el teclado.
  document.querySelector<HTMLElement>(`#${PLAY_ID} [data-start-challenge]`)?.focus({ preventScroll: true });
}

/**
 * Enlace de una tarjeta de reto. En la página del reto, el juego cambia más
 * abajo, fuera de la vista: parecía que el botón no hacía nada. Así que se
 * baja hasta él, también si se pulsa el reto que ya estaba elegido (la URL no
 * cambia y la navegación no haría nada).
 */
export function DailyCardLink({ href, selected, className, children }: { href: string; selected: boolean; className: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (!href.endsWith(`#${PLAY_ID}`) || !document.getElementById(PLAY_ID)) return;
        if (selected) {
          event.preventDefault();
          scrollToPlay();
        }
      }}
    >
      {children}
    </Link>
  );
}

/**
 * Al llegar con #jugar (desde otra página o al cambiar de reto), baja hasta el
 * juego cuando ya está pintado: el salto del navegador llega antes de que
 * cargue y se queda corto. `slot` vuelve a lanzarlo al cambiar de reto.
 */
export function ScrollToPlay({ slot }: { slot: string }) {
  useEffect(() => {
    if (window.location.hash === `#${PLAY_ID}`) requestAnimationFrame(scrollToPlay);
  }, [slot]);
  return null;
}
