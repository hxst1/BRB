"use client";

import { useEffect, useState } from "react";
import { useMessages } from "@/lib/i18n/client";

/**
 * Comparte una partida guardada como imagen de historia (app/api/share/story).
 * En el móvil abre el menú de compartir del sistema con la imagen, y desde ahí
 * Instagram la abre en el editor de historias; donde no se puede compartir un
 * archivo (el ordenador), la descarga.
 *
 * La imagen se prepara en cuanto aparece el botón: Safari solo deja abrir el
 * menú de compartir justo al pulsar, sin esperar a una descarga.
 */
export function ShareStory({ runId, game }: { runId: string; game: string }) {
  const m = useMessages();
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/share/story/${runId}`)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (!cancelled) setFile(new File([blob], m.story.fileName(game), { type: "image/png" }));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, game, m]);

  if (failed) return null;
  const canShare = file !== null && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }) === true;

  function share() {
    if (!file) return;
    if (canShare) {
      // Solo la imagen: con texto o enlace, algunas apps (Instagram) no salen en el menú.
      navigator.share({ files: [file] }).catch(() => undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={!file}
      className="mt-1 inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-muted disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <rect x="5" y="2.5" width="14" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="11" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      {!file ? m.story.preparing : canShare ? m.story.share : m.story.download}
    </button>
  );
}
