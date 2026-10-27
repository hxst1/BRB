"use client";

import { Suspense, useLayoutEffect, type CSSProperties, type ReactNode } from "react";
import { applySessionHint } from "@/lib/session-hint";

/*
 * Piezas de los esqueletos de carga. Cada esqueleto copia el contenedor, los
 * márgenes y los tamaños de lo que sustituye (con las mismas clases), para
 * que al llegar los datos no se mueva nada. El color y el latido están en
 * globals.css (.skeleton); con movimiento reducido no laten.
 */

/** Un bloque en el sitio de algo que aún no ha llegado (tarjeta, avatar, botón…). Su forma va en `className`. */
export function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`skeleton block ${className}`} style={style} />;
}

/**
 * Una línea de texto: ocupa el alto exacto de una línea con la letra de
 * `className` (text-sm, text-3xl…); la barra, algo menos, como las letras.
 * El ancho, también en `className`.
 */
export function TextLine({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex h-[1lh] items-center ${className}`}>
      <span className="skeleton block h-[0.6em] w-full rounded-[0.3em]" />
    </span>
  );
}

/**
 * Selector de pastillas (dificultad, periodo, pestañas…) mientras carga: el
 * de verdad, con sus textos, pero sin poder pulsarse. `item`: el relleno y
 * la letra de cada opción, como en el original.
 */
export function ToggleSkeleton({
  options,
  active = 0,
  item = "px-4 py-1.5 text-sm",
  className = "inline-flex self-start",
}: {
  options: ReactNode[];
  active?: number;
  item?: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={`${className} rounded-full bg-line/60 p-1`}>
      {options.map((option, i) => (
        <span key={i} className={`rounded-full ${item} ${i === active ? "bg-surface font-medium shadow-soft" : "text-muted"}`}>
          {option}
        </span>
      ))}
    </div>
  );
}

/**
 * Suspense con esqueleto. Lo que llega lo sustituye con un fundido corto
 * (.reveal, en globals.css); el envoltorio no cuenta para la maquetación.
 * `fade={false}` cuando el esqueleto ya enseña casi todo el texto de verdad:
 * fundirlo lo haría parpadear.
 */
export function Loading({ skeleton, fade = true, children }: { skeleton: ReactNode; fade?: boolean; children: ReactNode }) {
  return (
    <Suspense fallback={skeleton}>
      <div className={fade ? "reveal contents" : "contents"}>{children}</div>
    </Suspense>
  );
}

/**
 * En los esqueletos que cambian con la sesión (signed-in: / signed-out:),
 * pone al día data-session antes de pintar: el script del <head> solo la
 * mira al cargar la página, y desde entonces se puede haber entrado o salido.
 */
export function SessionHint() {
  useLayoutEffect(applySessionHint, []);
  return null;
}
