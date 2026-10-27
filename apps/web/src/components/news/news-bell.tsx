"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MegaphoneIcon } from "@/components/nav/icons";
import { useMessages, usePagePath } from "@/lib/i18n/client";

/** Cuándo abrió este navegador /novedades por última vez. */
const SEEN_KEY = "news:seen-at";
/** Sin visita guardada, solo cuenta como nuevo lo de las dos últimas semanas. */
const FRESH_MS = 14 * 24 * 60 * 60 * 1000;

function readSeen(): number | null {
  try {
    const value = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Megáfono de la cabecera: lleva a /novedades, con un punto si hay un anuncio
 * o un juego más nuevo que la última vez que se abrió (`latestAt`, del
 * servidor). Lo visto se recuerda en el navegador, así que vale también sin cuenta.
 */
export function NewsBell({ latestAt }: { latestAt: string | null }) {
  const m = useMessages();
  const pathname = usePagePath();
  const [unseen, setUnseen] = useState(false);
  const onNews = pathname === "/novedades";

  useEffect(() => {
    const latest = latestAt ? Date.parse(latestAt) : 0;
    if (onNews) {
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {
        // Sin almacenamiento: el punto volverá a salir, nada más.
      }
    }
    const seen = readSeen();
    // Se lee después de montar: en el servidor no se sabe qué ha visto este navegador.
    queueMicrotask(() => setUnseen(!onNews && latest > (seen ?? Date.now() - FRESH_MS)));
  }, [latestAt, onNews]);

  return (
    <Link
      href="/novedades"
      aria-label={unseen ? m.nav.newsUnseen : m.nav.news}
      title={m.nav.news}
      aria-current={onNews ? "page" : undefined}
      className={`relative grid size-9 shrink-0 place-items-center rounded-full transition-colors ${
        onNews ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
      }`}
    >
      <MegaphoneIcon />
      {unseen && <span aria-hidden className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-bg bg-danger" />}
    </Link>
  );
}
