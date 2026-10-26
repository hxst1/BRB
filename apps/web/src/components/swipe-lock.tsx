"use client";

import { useEffect, useRef } from "react";

export type SwipeDirection = "up" | "down" | "left" | "right";

/**
 * Para los juegos en tiempo real (Snake, Tron, Pong): mientras `active`, la
 * página no se desplaza con el dedo ni recarga al tirar hacia abajo (clase
 * swipe-lock en globals.css), y deslizar en cualquier sitio de la pantalla
 * llama a `onSwipe`, no solo sobre el tablero. Con el pulgar es fácil salirse
 * y, si la página se mueve a media partida, se pierde.
 *
 * Solo toques y lápiz: con el ratón se sigue jugando sobre el tablero.
 */
export function useSwipeLock(active: boolean, onSwipe?: (direction: SwipeDirection) => void, threshold = 20) {
  const latest = useRef(onSwipe);
  useEffect(() => {
    latest.current = onSwipe;
  });

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add("swipe-lock");

    let origin: { x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || (event.target instanceof Element && event.target.closest("button, a, input, textarea"))) return;
      origin = { x: event.clientX, y: event.clientY };
    };
    // El giro se lanza en cuanto el dedo recorre lo suficiente, sin esperar a soltar.
    const move = (event: PointerEvent) => {
      if (!origin || !latest.current) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      latest.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
      origin = { x: event.clientX, y: event.clientY };
    };
    const up = () => (origin = null);

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      root.classList.remove("swipe-lock");
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [active, threshold]);
}
