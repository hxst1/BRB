"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMessages } from "@/lib/i18n/client";
import { seenId } from "@/lib/news";
import { createClient } from "@/lib/supabase/client";

function markSeen(slugs: string[]) {
  if (slugs.length === 0) return;
  // La consulta solo sale al pedir su resultado (then): sin él no se envía.
  void createClient()
    .rpc("mark_announcements_seen", { ids: slugs.slice(0, 20).map(seenId) })
    .then(({ error }) => error && console.error("novedades: no se han podido marcar como vistas", error));
}

/**
 * En la portada: el último anuncio que aún no has visto, con un enlace a
 * /novedades. Al abrirlo o cerrarlo, queda visto y no vuelve a salir.
 */
export function NewsBanner({ slug, kind, title }: { slug: string; kind: string; title: string }) {
  const m = useMessages();
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <aside aria-label={m.newsPage.title} className="flex items-center gap-3 rounded-3xl bg-surface p-3 pl-4 shadow-soft">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold text-muted">{kind}</span>
        <Link href={`/novedades#${slug}`} onClick={() => markSeen([slug])} className="font-semibold text-balance underline-offset-4 hover:underline">
          {title}
        </Link>
      </span>
      <button
        type="button"
        onClick={() => {
          markSeen([slug]);
          setOpen(false);
        }}
        aria-label={m.newsPage.dismiss}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
      >
        ×
      </button>
    </aside>
  );
}

/** En /novedades: lo que se ve en la página queda visto. */
export function MarkNewsSeen({ slugs }: { slugs: string[] }) {
  const key = slugs.join(",");
  useEffect(() => {
    markSeen(key ? key.split(",") : []);
  }, [key]);
  return null;
}
