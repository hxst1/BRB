import { ViewTransition, type ReactNode } from "react";

/**
 * Transición entre páginas. La plantilla se vuelve a montar en cada
 * navegación, así que aquí sí hay entrada y salida (en el layout, no). Al
 * cambiar de sección con la navegación (nav-forward / nav-back, ver
 * navTransition), la página se desliza hacia el lado de su pestaña; en el resto,
 * un fundido corto. La cabecera y la barra de pestañas no se mueven. Las
 * animaciones están en globals.css (::view-transition-*).
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
