"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Errores del navegador que nadie ha capturado (los de React los avisan error.tsx y global-error.tsx). */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Los de scripts de otros dominios llegan sin datos ("Script error."): no sirven.
      if (!event.error && event.message === "Script error.") return;
      reportError(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isSkippedTransition(event.reason)) return;
      reportError(event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

/**
 * El navegador cancela la transición entre páginas si cambia el tamaño de la
 * pantalla a mitad (en Android, al esconderse la barra de direcciones o salir el
 * teclado) o si empieza otra. La página cambia igual, solo sin animación, pero
 * React deja la promesa rechazada sin capturar: no es un fallo.
 */
function isSkippedTransition(reason: unknown) {
  return (
    reason instanceof DOMException &&
    (reason.name === "InvalidStateError" || reason.name === "AbortError") &&
    reason.message.startsWith("Transition was")
  );
}
