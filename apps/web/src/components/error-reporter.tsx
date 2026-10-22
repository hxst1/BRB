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
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
