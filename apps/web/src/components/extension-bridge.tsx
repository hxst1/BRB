"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Dentro de la extensión de Chrome (que muestra la web en su ventanita), le
 * cuenta en qué pantalla está para volver a ella al abrirla otra vez. Solo
 * habla con una página chrome-extension:// que la contenga.
 */
export function ExtensionBridge() {
  const pathname = usePathname();
  useEffect(() => {
    const parent = window.location.ancestorOrigins?.[0];
    if (window.top === window || !parent?.startsWith("chrome-extension://")) return;
    document.documentElement.dataset.embed = "extension";
    window.parent.postMessage({ type: "brb:path", path: window.location.pathname + window.location.search }, parent);
  }, [pathname]);
  return null;
}
