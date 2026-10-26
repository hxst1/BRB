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
      // Como el botón secundario de los paneles de fin de partida ("Retar a un amigo").
      className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 font-semibold transition-colors hover:border-muted disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Mientras se prepara la imagen, el mismo texto (desactivado): sin saltos. */}
      {file && !canShare ? m.story.download : m.story.share}
    </button>
  );
}
