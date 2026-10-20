"use client";

import { useRef, type HTMLAttributes, type MouseEvent, type PointerEvent, type RefObject } from "react";

/**
 * Arrastrar con el ratón para desplazar una fila con scroll horizontal (con el
 * dedo o el trackpad ya se desliza sola). Si se ha arrastrado, el clic que
 * llega al soltar se anula para no abrir lo que hubiera debajo.
 */
export function useDragScroll<T extends HTMLElement>(ref: RefObject<T | null>) {
  const drag = useRef<{ startX: number; scroll: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  function end() {
    if (drag.current?.moved && ref.current) {
      ref.current.style.scrollSnapType = "";
      dragged.current = true;
      setTimeout(() => (dragged.current = false), 0);
    }
    drag.current = null;
  }

  return {
    onPointerDown(event: PointerEvent<T>) {
      if (event.pointerType !== "mouse" || event.button !== 0 || !ref.current) return;
      drag.current = { startX: event.clientX, scroll: ref.current.scrollLeft, moved: false };
    },
    onPointerMove(event: PointerEvent<T>) {
      const state = drag.current;
      const element = ref.current;
      if (!state || !element) return;
      const dx = event.clientX - state.startX;
      if (!state.moved && Math.abs(dx) > 5) {
        state.moved = true;
        try {
          element.setPointerCapture(event.pointerId);
        } catch {
          // Puntero ya inexistente: el arrastre sigue funcionando sin captura.
        }
        // El encaje lucharía contra el arrastre: se desactiva mientras dura.
        element.style.scrollSnapType = "none";
      }
      if (state.moved) element.scrollLeft = state.scroll - dx;
    },
    onPointerUp: end,
    onPointerCancel: end,
    onClickCapture(event: MouseEvent<T>) {
      if (!dragged.current) return;
      event.preventDefault();
      event.stopPropagation();
    },
    // Sin esto, el navegador intenta arrastrar enlaces e imágenes.
    onDragStart(event: MouseEvent<T>) {
      event.preventDefault();
    },
  } satisfies HTMLAttributes<T>;
}

/**
 * Lista con scroll horizontal que también se puede arrastrar con el ratón.
 * El cursor de "agarrar" lo decide quien la usa (solo donde de verdad desliza).
 */
export function DragScrollList({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const handlers = useDragScroll(ref);
  return (
    <ul ref={ref} {...handlers} className={`${className} select-none`}>
      {children}
    </ul>
  );
}
